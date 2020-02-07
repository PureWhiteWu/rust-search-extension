var levenshtein_row2 = [];

function levenshtein(s1, s2) {
    if (s1 === s2) {
        return 0;
    }
    var s1_len = s1.length, s2_len = s2.length;
    if (s1_len && s2_len) {
        var i1 = 0, i2 = 0, a, b, c, c2, row = levenshtein_row2;
        while (i1 < s1_len) {
            row[i1] = ++i1;
        }
        while (i2 < s2_len) {
            c2 = s2.charCodeAt(i2);
            a = i2;
            ++i2;
            b = i2;
            for (i1 = 0; i1 < s1_len; ++i1) {
                c = a + (s1.charCodeAt(i1) !== c2 ? 1 : 0);
                a = row[i1];
                b = b < a ? (b < c ? b + 1 : c) : (a < c ? a + 1 : c);
                row[i1] = b;
            }
        }
        return b;
    }
    return s1_len + s2_len;
}

// Prototype function to perform levenshtein contain search.
String.prototype.levenshteinContains = function(keyword) {
    let len = keyword.length;
    if (this === keyword) return true;

    for (let i = 0; i <= this.length - len; i++) {
        if (levenshtein(this.substring(i, len), keyword) <= 1) {
            return true;
        }
    }
    return false;
};

function CrateSearch(crateIndex, crateIndexVersion = 1) {
    this.crateIndexVersion = crateIndexVersion;
    this.crateIndex = crateIndex;
    this.crateIds = Object.keys(crateIndex).sort();
}

CrateSearch.getLatestIndexVersion = function() {
    return parseInt(localStorage.getItem("crate-index-version") || 1);
};

CrateSearch.getLatestCrateIndex = function() {
    return JSON.parse(localStorage.getItem("crate-index") || null);
};

CrateSearch.prototype.ensureLatestCrateIndex = async function() {
    if (CrateSearch.getLatestCrateIndex() > this.crateIndexVersion) {
        this.crateIndex = CrateSearch.getLatestCrateIndex() || this.crateIndex;
        this.crateIds = Object.keys(crateIndex).sort();
    }
};

/**
 * Perform prefix levenshtein search.
 * @param keyword the keyword to search against.
 * @param limit the max result length, default is 10.
 * @returns
 */
CrateSearch.prototype.search = async function(keyword, limit = 10) {
    let result = [];

    await this.ensureLatestCrateIndex();
    for (let rawCrateId of this.crateIds) {
        let crateId = rawCrateId.replace(/[-_\s]/ig, "");
        if (crateId.length < keyword.length) continue;

        let index = crateId.indexOf(keyword);
        if (index !== -1) {
            result.push({
                id: rawCrateId,
                matchIndex: index,
            });
        } else if (keyword.length >= 4 && crateId.levenshteinContains(keyword)) {
            result.push({
                id: rawCrateId,
                matchIndex: 999, // Levenshtein contain result always has highest matchIndex.
            });
        }
    }
    // Sort the result, the lower matchIndex, the shorter length, the higher rank.
    return result.sort((a, b) => {
        if (a.matchIndex === b.matchIndex) {
            return a.id.length - b.id.length;
        }
        return a.matchIndex - b.matchIndex;
    })
        .slice(0, limit)
        .map(item => {
            let [description, version] = this.crateIndex[item.id];
            return {
                id: item.id,
                description: deminifier.cleanMinifiedDescription(description),
                version: version,
            }
        });
};