const synonyms: Record<string, Record<string, string>> = {
  cinematic: {
    voice: "celestial echo",
    text: "epic testament",
    good: "legendary",
    bad: "catastrophic",
    happy: "triumphant",
    sad: "tragic",
    run: "dash across boundaries",
    generate: "forge from the elements",
    audio: "sonic resonance",
    testing: "embarking on a trial",
    speech: "sovereign declaration",
  },
  podcast: {
    voice: "awesome vocal track",
    text: "story block",
    good: "super cool",
    bad: "bummer",
    happy: "stoked",
    sad: "down in the dumps",
    run: "hustle",
    generate: "crank out",
    audio: "sound bite",
    testing: "checking out",
    speech: "chat",
  },
  documentary: {
    voice: "auditory signals",
    text: "recorded description",
    good: "exceptional",
    bad: "suboptimal",
    happy: "satisfied",
    sad: "somber",
    run: "proceed rapidly",
    generate: "synthesize systematically",
    audio: "acoustic data",
    testing: "experimental analysis",
    speech: "narrative voiceover",
  },
  conversational: {
    voice: "spoken voice",
    text: "words",
    good: "nice",
    bad: "rough",
    happy: "cheerful",
    sad: "blue",
    run: "go",
    generate: "make",
    audio: "sound",
    testing: "trying out",
    speech: "talk",
  }
};

export function rewriteTextForTone(text: string, tone: string): string {
  const selectedTone = tone.toLowerCase();
  
  let cleaned = text.trim();
  if (!cleaned) return "";

  // Check if it's already rewritten to prevent double-wrapping
  if (selectedTone === "cinematic" && cleaned.startsWith('In a world of shadows, a truth emerges: "') && cleaned.endsWith('". The journey has begun, and the echo remains forever.')) {
    return cleaned;
  }
  if (selectedTone === "documentary" && cleaned.startsWith('Scientific observations indicate that: "') && cleaned.endsWith('". This phenomenon continues to be scrutinized by researchers worldwide.')) {
    return cleaned;
  }
  if (selectedTone === "podcast" && cleaned.startsWith('Hey guys! Check this out: "') && cleaned.endsWith('". Pretty wild, right? Let me know what you think in the comments below!')) {
    return cleaned;
  }
  if (selectedTone === "conversational" && cleaned.startsWith('So basically, "') && cleaned.endsWith('". Yeah, that is about it.')) {
    return cleaned;
  }

  // Perform word replacements
  const toneSynonyms = synonyms[selectedTone];
  if (toneSynonyms) {
    for (const [key, replacement] of Object.entries(toneSynonyms)) {
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      cleaned = cleaned.replace(regex, (match) => {
        if (match[0] === match[0].toUpperCase()) {
          return replacement[0].toUpperCase() + replacement.slice(1);
        }
        return replacement;
      });
    }
  }

  // Format with introductions and outros
  if (selectedTone === "cinematic") {
    return `In a world of shadows, a truth emerges: "${cleaned}". The journey has begun, and the echo remains forever.`;
  } else if (selectedTone === "documentary") {
    return `Scientific observations indicate that: "${cleaned}". This phenomenon continues to be scrutinized by researchers worldwide.`;
  } else if (selectedTone === "podcast") {
    return `Hey guys! Check this out: "${cleaned}". Pretty wild, right? Let me know what you think in the comments below!`;
  } else if (selectedTone === "conversational") {
    return `So basically, "${cleaned}". Yeah, that is about it.`;
  }

  return cleaned;
}
