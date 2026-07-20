export const formatPlayerName = (name) => {
    if (!name) return '';
    
    // If name is 16 characters or less, return as is
    if (name.length <= 16) return name;
    
    // Split by whitespace
    const parts = name.trim().split(/\s+/).filter(part => part.length > 0);
    
    // If only one word, just truncate
    if (parts.length === 1) {
      return name.slice(0, 16);
    }
    
    // If two words: "FirstInitial. LastName"
    if (parts.length === 2) {
      const firstInitial = parts[0][0].toUpperCase();
      const lastName = parts[1];
      return `${firstInitial}. ${lastName}`;
    }
    
    // For 3 or more words: get initials of all except last, then full last name
    const lastName = parts[parts.length - 1];
    const initials = parts.slice(0, -1).map(part => part[0].toUpperCase()).join('. ');
    
    return `${initials}. ${lastName}`;
};