
function normalizeMessage(text) {
    return text
        .replace(/subscriber\s+for\s+(\d+)/gi, 'subscriber $1')
        .replace(/\s+bill\s+of\s+(\d+)/gi, 'bill for $1') // bill of 123
        .replace(/\s+the\s+bill\s+(\d+)/gi, 'bill $1')
        .replace(/\bsub for\b/gi, 'subscriber')
        .replace(/\bFeb\b/gi, 'February') // ex feb
        .replace(/\s{2,}/g, ' ') // double space 
        .replace(/[^\w\s$]/gi, '') // delete punct
        .replace(/\s+/g, ' ')      // clean spaces
        .trim();
}

module.exports = { normalizeMessage };
