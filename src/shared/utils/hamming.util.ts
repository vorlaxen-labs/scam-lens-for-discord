export function hammingDistance(hashA: string, hashB: string): number {
  if (hashA.length !== hashB.length) {
    throw new Error('Hash lengths must match for Hamming distance');
  }

  let distance = 0;
  for (let index = 0; index < hashA.length; index += 1) {
    const nibbleA = parseInt(hashA[index]!, 16);
    const nibbleB = parseInt(hashB[index]!, 16);
    if (Number.isNaN(nibbleA) || Number.isNaN(nibbleB)) {
      throw new Error('Invalid hex hash character');
    }
    let xor = nibbleA ^ nibbleB;
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

export function isValidHexHash(value: string): boolean {
  return /^[0-9a-f]+$/i.test(value) && value.length >= 8;
}
