/**
 * Check if a pawn can move with the given dice value
 */
export const canPawnMove = (pawn, diceValue) => {
  // Pawn is in base - can only exit with 6
  if (!pawn.current_position || pawn.current_position === "0") {
    return diceValue === 6;
  }

  // Pawn is finished - cannot move
  if (pawn.current_position === "finished") {
    return false;
  }

  // Pawn is on the board
  if (pawn.current_position?.includes("cell-area")) {
    const match = pawn.current_position.match(/cell-area-(\d+)-id-(\d+)/);
    if (match) {
      const currentId = Number.parseInt(match[2], 10);
      
      // Check if in home stretch (area matches player's color area && id >= 7)
      // You may need to adjust this logic based on your board structure
      if (currentId >= 8 && currentId <= 12) {
        const movesNeeded = 13 - currentId; // Distance to finish (13 = finish position)
        if (movesNeeded < diceValue) return false;
      }
      
    }
  }

  // Default: assume can move
  return true;
};

/**
 * Check if clearDice should be called automatically
 * Returns true if:
 * 1. All pawns are locked (in base with current_position === "0") AND diceValue !== 6
 * 2. OR three pawns are finished or three locked, fourth pawn doesn't have exact moves to finish
 * 3. OR all pawns are unlocked but none can make a valid move with current dice value
 */
export const shouldAutoClearDice = (myPawns, diceValue) => {
  if (!myPawns || !Array.isArray(myPawns) || myPawns.length === 0) {
    return false;
  }

  // 1) Quick special case: all locked and dice is not 6
  const allLocked = myPawns.every(pawn => !pawn.current_position || pawn.current_position === "0");
  if (allLocked && diceValue !== 6) {
    return true;
  }

  // 2) Generic rule: if NO pawn can move, clear dice
  const hasAnyValidMove = myPawns.some((pawn) => {
    const pos = pawn.current_position;

    // Finished pawns never move
    if (pos === "finished") return false;

    // Locked / base pawns only move on 6
    if (!pos || pos === "0") {
      return diceValue === 6;
    }

    // Active pawn on board — defer to your movement rules
    return canPawnMove(pawn, diceValue);
  });

  return !hasAnyValidMove;
};
