import { GoogleGenAI, Type } from "@google/genai";
import { Player, Team } from "../types";

export const generateTeamsWithAI = async (
  selectedPlayers: Player[],
  playerPerformanceMap?: Record<string, { winRate: number, totalGames: number }>
): Promise<Team[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const playerCount = selectedPlayers.length;

  // Regra de negócio: < 22 jogadores = 3 times | >= 22 jogadores = 4 times
  const teamCount = playerCount < 22 ? 3 : 4;

  const playersContext = selectedPlayers.map(p => {
    const perf = playerPerformanceMap?.[p.id];
    return {
      id: p.id,
      name: p.name,
      stars: p.stars,
      isGoalkeeper: p.isGoalkeeper,
      performance: perf ? `${(perf.winRate * 100).toFixed(0)}% win rate em ${perf.totalGames} jogos` : 'Sem histórico'
    };
  });

  const prompt = `
    Atue como um técnico profissional de futebol organizando um sorteio.
    Total de Jogadores: ${playerCount}.
    Quantidade de Times a gerar: ${teamCount}.
    
    REGRAS OBRIGATÓRIAS:
    1. DISTRIBUIÇÃO DE GOLEIROS: É terminantemente proibido que um time tenha 2 goleiros (isGoalkeeper: true). Distribua os goleiros entre os times. Se houver menos goleiros que times, alguns times ficarão sem.
    2. EQUILÍBRIO TÉCNICO: O objetivo é que a soma de "habilidade efetiva" de cada time seja quase idêntica.
    3. CRITÉRIOS DE EQUILÍBRIO: 
       - Use 'stars' (1-5) como base principal.
       - Use 'performance' (win rate histórica) como ajuste fino. Um jogador com 3 estrelas mas 80% de win rate deve ser considerado mais forte que um de 3 estrelas com 20%.
    4. TAMANHO DOS TIMES: 
       - Se N < 21, divida em 3 times (mesmo que um time tenha menos jogadores).
       - Se N >= 22, divida em 4 times (mesmo que os tamanhos variem).
    
    Dados dos Jogadores:
    ${JSON.stringify(playersContext)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              playerIds: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["name", "playerIds"]
          }
        }
      }
    });

    const generatedData = JSON.parse(response.text || "[]");
    
    const teams: Team[] = generatedData.map((teamData: any, index: number) => {
        const teamPlayers = teamData.playerIds.map((id: string) => 
            selectedPlayers.find(p => p.id === id)
        ).filter(Boolean) as Player[];

        const totalStars = teamPlayers.reduce((acc, p) => acc + p.stars, 0);
        
        return {
            id: index + 1,
            name: teamData.name || `Time ${index + 1}`,
            players: teamPlayers,
            totalStars,
            averageStars: teamPlayers.length > 0 ? parseFloat((totalStars / teamPlayers.length).toFixed(1)) : 0
        };
    });

    return teams;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const generatePlayerAvatar = async (playerName: string, isGoalkeeper: boolean): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    A cool, stylized, vector art profile icon of a soccer player. 
    Style: Minimalist, flat design, vibrant green and black colors (Spotify style), dark background.
    Subject: A player character named ${playerName} ${isGoalkeeper ? 'wearing goalkeeper gloves' : 'wearing a soccer jersey'}.
    The image should be centered, circular composition if possible, high quality.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned");
  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    throw error;
  }
};
