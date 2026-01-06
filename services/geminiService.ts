import { GoogleGenAI, Type } from "@google/genai";
import { Player, Team } from "../types";

export const generateTeamsWithAI = async (
  selectedPlayers: Player[],
  playerPerformanceMap?: Record<string, { winRate: number, totalGames: number }>
): Promise<Team[]> => {
  // Always use a direct initialization with the API key from process.env.API_KEY.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const playerCount = selectedPlayers.length;

  // Determine team count rule for context
  let teamCount = 3;
  if (playerCount >= 22) teamCount = 4;

  const playersContext = selectedPlayers.map(p => {
    const perf = playerPerformanceMap?.[p.id];
    return {
      id: p.id,
      name: p.name,
      stars: p.stars,
      isGoalkeeper: p.isGoalkeeper,
      performance: perf ? `${(perf.winRate * 100).toFixed(0)}% win rate in ${perf.totalGames} games` : 'No history'
    };
  });

  const prompt = `
    Organize a soccer match with these players.
    Total Players: ${playerCount}.
    Target Teams: ${teamCount}.
    
    CRITICAL BALANCE RULES:
    1. Distribute Goalkeepers (isGoalkeeper: true) as evenly as possible.
    2. Primary Balance: Use 'stars' (1-5 manual skill) to ensure teams are leveled.
    3. Secondary Balance (Tie-breaker): Use the provided 'performance' (win rate from match history) to adjust. 
       If a player has high stars but a very low win rate, they might be overrated. 
       If a player has low stars but a high win rate, they might be a "lucky charm" or underrated.
    4. The goal is that each team has a similar sum of 'effective skill' (stars + performance weight).
    
    Players Data:
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
    
    // Map back to full player objects and calculate stats
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