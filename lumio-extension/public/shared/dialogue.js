// What the companion says, per character and mood. Each character's lines come from its folklore:
// - Mangkukulam: a witch who casts kulam (curses) with dolls, herbs and potions; a spell is only as good as its ingredients
// - Manananggal: splits from its lower half at night and flies on bat wings; salt, garlic and sunrise are its undoing
// - Tikbalang: a horse-headed trickster who leads travelers in circles; wearing your shirt inside out breaks the spell,
//   a sun shower is a "tikbalang wedding", and whoever plucks the golden hairs from its mane can tame it
// Used by the dashboard (Companion card) and the walking pet's click bubble (via background.js).

export const DIALOGUE = {
    mangkukulam: {
        curious: [
            "A good spell needs good ingredients. A good answer needs good sources.",
            "I never trust a potion I didn't brew myself. Check where that answer came from.",
            "Even my doll knows: one pin is a guess, three pins are evidence.",
            "Hmm... smells like a claim. Fetch me a source and we'll see if it's real.",
            "Curiosity is the oldest magic. Keep asking, but keep checking.",
            "My grandmother's spellbook had footnotes. Yours should too."
        ],
        focused: [
            "Now THAT is proper witchcraft: comparing sources before stirring the pot.",
            "You checked it! The cauldron bubbles with approval.",
            "Ingredients verified, recipe confirmed. A fine brew, apprentice.",
            "Research is just spellwork with receipts. Keep going.",
            "See? No curse can stick to a claim that's been double-checked."
        ],
        concerned: [
            "Careful, child. Too much AI and your own thinking falls under a kulam.",
            "You've been chanting the same incantation for a while. Take a break and think for yourself.",
            "An answer you never checked is like a potion with unknown herbs. Do you really want to drink it?",
            "My crystal ball is cloudy. Too many unchecked answers today.",
            "Even the strongest spell weakens if you lean on it too long. Use Compass!",
            "I've hexed people for less. Verify that claim before you trust it."
        ],
        idle: [
            "Zzz... resting my eyes... and my broom...",
            "The cauldron is cold. Wake me when you need a second opinion.",
            "Zzz... dreaming of herbs and well-cited sources...",
            "Shh. Even witches need their beauty sleep."
        ]
    },

    manananggal: {
        curious: [
            "I leave half of myself behind every night. Don't leave half your research behind.",
            "Stay curious, but fly home before sunrise. Don't believe everything you read in the dark.",
            "My wings carry me far. Sources carry an answer further.",
            "An answer without a source is like me without my legs: only half the story.",
            "The night is full of whispers. Check which ones are true.",
            "I can see the whole village from up here. Look at more than one source, too."
        ],
        focused: [
            "You found the source! Whole again, like me returning to my other half.",
            "Sharp eyes! Even in the dark, you found what's true.",
            "That's how you fly: checking every rooftop before you land.",
            "Good hunting tonight. That claim has been verified.",
            "Sunrise won't catch you unprepared. Your facts are in order."
        ],
        concerned: [
            "You've been flying with the AI all night. Rest your wings, the sun is coming.",
            "Careful! Someone sprinkled salt on your answers. Check them before you return.",
            "Too much screen-light, not enough of your own thinking. Even I come back down to earth.",
            "An unchecked claim smells worse than garlic to me. Use Compass!",
            "Don't let the AI fly off with your other half. Think for yourself too.",
            "My wings are tired just watching you. Take a break and verify what you've learned."
        ],
        idle: [
            "Zzz... back together and resting until nightfall...",
            "Zzz... the sun is up, so I'm staying grounded...",
            "Zzz... wings folded, both halves asleep...",
            "Shh... even creatures of the night need their sleep."
        ]
    },

    tikbalang: {
        curious: [
            "I love leading travelers in circles. Make sure an AI answer isn't doing the same to you.",
            "Lost in the forest of answers? Turn your shirt inside out... or just check a source.",
            "Sun and rain at the same time? That's my wedding. Strange things happen, so verify them.",
            "Follow the facts, not the trail of hoofprints I left to confuse you.",
            "A clever traveler always asks: who said this, and how do they know?",
            "I've walked these woods for centuries. Trust me, the shortcut is usually wrong."
        ],
        focused: [
            "You didn't fall for my tricks! You checked the source like a true traveler.",
            "Shirt inside out, eyes wide open. Nothing can lead you astray now.",
            "You plucked a golden hair from my mane. I'll behave. Good research!",
            "No circles today. You found the straight path to the truth.",
            "Even a trickster respects someone who checks the map twice."
        ],
        concerned: [
            "You've been wandering the same path for too long. Is the AI leading you in circles?",
            "Hee-hee! You believed that without checking? My favorite kind of traveler.",
            "Careful, traveler. The forest of answers is easy to get lost in. Use Compass to find your way.",
            "Turn your shirt inside out and step away from the screen for a bit.",
            "Too much AI and you'll forget your own way home. Think it through yourself.",
            "I can smell an unchecked claim from the top of my balete tree."
        ],
        idle: [
            "Zzz... napping on top of the balete tree...",
            "Zzz... no travelers to trick today...",
            "Zzz... dreaming of sun showers and cigars...",
            "Zzz... the forest is quiet. Wake me if you get lost."
        ]
    }
};

// used for a character that has no lines of its own
export const GENERIC_DIALOGUE = {
    curious: ["Stay curious! Remember to verify tricky answers."],
    focused: ["You've been researching safely. Great job comparing sources!"],
    concerned: ["You are relying heavily on AI right now. Use Compass to check those claims!"],
    idle: ["Zzz... No recent AI activity."]
};

export function getDialogueLines(characterId, mood) {
    return DIALOGUE[characterId]?.[mood] || GENERIC_DIALOGUE[mood] || GENERIC_DIALOGUE.curious;
}

// a random line, avoiding `previous` when there's another option
export function pickDialogueLine(characterId, mood, previous = null) {
    const lines = getDialogueLines(characterId, mood);
    const choices = lines.length > 1 ? lines.filter(line => line !== previous) : lines;
    return choices[Math.floor(Math.random() * choices.length)];
}
