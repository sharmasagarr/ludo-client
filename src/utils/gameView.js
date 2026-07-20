export const colorTransformMap = {
  blue: {
    blue: "blue",
    red: "red",
    green: "green",
    yellow: "yellow",
  },
  red: {
    red: "blue",
    green: "red",
    yellow: "green",
    blue: "yellow",
  },
  yellow: {
    yellow: "blue",
    blue: "red",
    red: "green",
    green: "yellow",
  },
  green: {
    green: "blue",
    yellow: "red",
    blue: "green",
    red: "yellow",
  },
};

/**
 * Safely read player's color from localStorage.currentBoard
 * Returns one of "red","green","yellow","blue" or default "blue"
 */
export function getMyColor() {
  try {
    if (typeof globalThis.window === "undefined") return "blue";
    const raw = globalThis.localStorage.getItem("currentBoard");
    const parsed = raw ? JSON.parse(raw) : {};
    const myColor = parsed?.myColor;
    return ["red", "green", "yellow", "blue"].includes(myColor)
      ? myColor
      : "blue";
  } catch {
    return "blue";
  }
}

/**
 * Transform grouped player object for display perspective
 * 
 * @param {Object} groupedByPlayer - Object with player_id keys containing { color, pawns }
 * @param {string} myColor - Current player's color (blue/red/green/yellow)
 * 
 * @returns {Object} Transformed object with added displayColor and original color preserved
 * 
 * Example:
 * Input: {
 *   "E64514": { color: "blue", pawns: [...] },
 *   "E29725": { color: "red", pawns: [...] }
 * }
 * For myColor="red":
 * Output: {
 *   "E64514": { color: "blue", displayColor: "yellow", pawns: [...] },
 *   "E29725": { color: "red", displayColor: "blue", pawns: [...] }
 * }
 */
export function transformGroupedPlayers(groupedByPlayer = {}, myColor = "blue") {
  if (!groupedByPlayer || typeof groupedByPlayer !== "object") {
    return {};
  }

  const map = colorTransformMap[myColor] || colorTransformMap.blue;
  const result = {};

  // Iterate through each player
  for (const [player_id, playerData] of Object.entries(groupedByPlayer)) {
    if (!playerData || typeof playerData !== "object") continue;

    const originalColor = playerData.color;
    const displayColor = map[originalColor] || originalColor;

    // Create transformed player object
    result[player_id] = {
      color: originalColor,           // Original server color
      displayColor: displayColor,     // Transformed display color
      pawns: playerData.pawns || []   // Keep pawns as-is
    };
  }

  // Sort the result by displayColor order (blue, red, green, yellow)
  const colorOrder = ["blue", "red", "green", "yellow"];
  const sortedResult = {};

  const sortedPlayerIds = Object.keys(result).sort((a, b) => {
    const colorA = result[a].displayColor || "";
    const colorB = result[b].displayColor || "";
    
    const indexA = colorOrder.indexOf(colorA);
    const indexB = colorOrder.indexOf(colorB);
    
    const posA = indexA === -1 ? 999 : indexA;
    const posB = indexB === -1 ? 999 : indexB;
    
    return posA - posB;
  });

  for (const player_id of sortedPlayerIds) {
    sortedResult[player_id] = result[player_id];
  }

  return sortedResult;
}

// Usage example:
/*
const groupedByPlayer = {
  "E64514": { color: "blue", pawns: [...] },
  "E29725": { color: "red", pawns: [...] },
  "E77148": { color: "green", pawns: [...] },
  "E22492": { color: "yellow", pawns: [...] }
};

const myColor = getMyColor(); // e.g., "red"
const transformed = transformGroupedPlayers(groupedByPlayer, myColor);

// Result for myColor="red":
// {
//   "E29725": { color: "red", displayColor: "blue", pawns: [...] },      // Red player appears as blue
//   "E77148": { color: "green", displayColor: "red", pawns: [...] },     // Green appears as red
//   "E22492": { color: "yellow", displayColor: "green", pawns: [...] },  // Yellow appears as green
//   "E64514": { color: "blue", displayColor: "yellow", pawns: [...] }    // Blue appears as yellow
// }
*/