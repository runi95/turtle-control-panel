export const levenshteinDistance = (a: string, b: string): number => {
    const arr = [];
    for (let i = 0; i <= b.length; i++) {
        arr[i] = [i];
        for (let j = 1; j <= a.length; j++) {
            arr[i][j] =
                i === 0
                    ? j
                    : Math.min(
                          arr[i - 1][j] + 1,
                          arr[i][j - 1] + 1,
                          arr[i - 1][j - 1] + (a[j - 1] === b[i - 1] ? 0 : 1)
                      );
        }
    }

    return arr[b.length][a.length];
};
