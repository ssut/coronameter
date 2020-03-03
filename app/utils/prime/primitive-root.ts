
import * as randomNumber from 'random-number-csprng';

const primes = Object.freeze({
  11: [2, 7],
  13: [2, 7, 11],
  17: [3, 5, 7, 11],
  19: [2, 3, 13],
  23: [5, 7, 11, 17, 19],
  29: [2, 3, 11, 19],
  31: [3, 11, 13, 17],
  37: [2, 5, 13, 17, 19],
  41: [7, 11, 13, 17, 19, 29],
  43: [3, 5, 19, 29],
  47: [5, 11, 13, 19, 23, 29, 31, 41, 43],
  53: [2, 3, 5, 19, 31, 41],
  59: [2, 11, 13, 23, 31, 37, 43, 47],
  61: [2, 7, 17, 31, 43, 59],
  67: [2, 7, 11, 13, 31, 41, 61],
  71: [7, 11, 13, 31, 47, 53, 59, 61, 67],
  73: [5, 11, 13, 29, 31, 47, 53, 59],
  79: [3, 7, 29, 37, 43, 47, 53, 59],
  83: [2, 5, 13, 19, 43, 47, 53, 67, 71, 73, 79],
  89: [3, 7, 13, 19, 23, 29, 31, 41, 43, 59, 61, 83],
  97: [5, 7, 13, 17, 23, 29, 37, 41, 59, 71, 83]
});

export const genPrimes = async (): Promise<[number, number]> => {
  const main = Object.keys(primes);
  const p = main[await randomNumber(0, main.length)];

  const primitiveRoots = primes[p];
  const q = primitiveRoots[await randomNumber(0, primitiveRoots.length)];
  return [Number(p), q];
};
