export const SUPPORTED_SIZES = Object.freeze([5, 7, 9]);

export function isSupportedSize(size) {
  return SUPPORTED_SIZES.includes(size);
}

function assertSupportedSize(size) {
  if (!isSupportedSize(size)) {
    throw new RangeError(`Unsupported puzzle size: ${size}`);
  }
}

export function createSolvedTiles(size) {
  assertSupportedSize(size);
  return Array.from({ length: size * size }, (_, index) => index);
}

export function tileBackgroundPosition(tile, size) {
  assertSupportedSize(size);
  const denominator = size - 1;

  return {
    xPercent: ((tile % size) / denominator) * 100,
    yPercent: (Math.floor(tile / size) / denominator) * 100,
  };
}

export function isSolved(tiles) {
  return tiles.every((tile, index) => tile === index);
}

export function shuffleTiles(tiles, random = Math.random) {
  const shuffled = [...tiles];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  if (isSolved(shuffled) && shuffled.length > 1) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }

  return shuffled;
}

export function createGame(size, random = Math.random) {
  assertSupportedSize(size);
  return {
    size,
    tiles: shuffleTiles(createSolvedTiles(size), random),
    selectedIndex: null,
    moves: 0,
    status: 'playing',
  };
}

export function selectTile(state, index) {
  if (state.status === 'completed') {
    return state;
  }

  if (state.selectedIndex === null) {
    return { ...state, selectedIndex: index };
  }

  if (state.selectedIndex === index) {
    return { ...state, selectedIndex: null };
  }

  const tiles = [...state.tiles];
  [tiles[state.selectedIndex], tiles[index]] = [tiles[index], tiles[state.selectedIndex]];

  return {
    ...state,
    tiles,
    selectedIndex: null,
    moves: state.moves + 1,
    status: isSolved(tiles) ? 'completed' : 'playing',
  };
}
