import {
  SUPPORTED_SIZES,
  createGame,
  selectTile,
  tileBackgroundPosition,
} from './puzzle.js';
import { createDragState, finishDrag, updateDragState } from './drag.js';
import { normalizeBestRecords, updateBestRecords } from './records.js';

export const DEFAULT_IMAGE_URL = './assets/puppy-puzzle.png';
export const BEST_RECORDS_KEY = 'puppy-puzzle-best-v1';

export function isUsableImageFile(file) {
  return Boolean(file && file.size > 0 && /^image\//i.test(file.type));
}

export function imageAspectRatio(width, height) {
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
    ? width / height
    : 16 / 9;
}

export function formatElapsed(milliseconds) {
  const elapsedSeconds = Math.floor(milliseconds / 1_000);
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

if (typeof document !== 'undefined') {
  const puzzle = document.querySelector('#puzzle');
  const startButton = document.querySelector('#start-button');
  const restartButton = document.querySelector('#restart-button');
  const uploadButton = document.querySelector('#upload-button');
  const imageUpload = document.querySelector('#image-upload');
  const moves = document.querySelector('#moves');
  const timer = document.querySelector('#timer');
  const previewImage = document.querySelector('#preview-image');
  const imageError = document.querySelector('#image-error');
  const completionDialog = document.querySelector('#completion-dialog');
  const finalMoves = document.querySelector('#final-moves');
  const finalTime = document.querySelector('#final-time');
  const finalDifficulty = document.querySelector('#final-difficulty');
  const completionAchievements = document.querySelector('#completion-achievements');
  const liveStatus = document.querySelector('#live-status');
  const difficultyControls = document.querySelector('#difficulty-controls');
  const difficultyButtons = [...difficultyControls.querySelectorAll('button[data-size]')];
  const currentDifficulty = document.querySelector('#current-difficulty');
  const bestMoves = document.querySelector('#best-moves');
  const bestTime = document.querySelector('#best-time');
  const replayButton = document.querySelector('#replay-button');
  const nextDifficultyButton = document.querySelector('#next-difficulty-button');

  let game = null;
  let selectedSize = SUPPORTED_SIZES[0];
  let startedAt = 0;
  let timerInterval = null;
  let currentImageUrl = DEFAULT_IMAGE_URL;
  let uploadedImageUrl = null;
  let dragState = null;
  let dragSourceElement = null;
  let dragTargetElement = null;
  let suppressNextClick = false;
  let recordsPersistenceAvailable = true;
  let bestRecords = loadBestRecords();

  previewImage.src = currentImageUrl;
  previewImage.addEventListener('error', () => {
    imageError.textContent = 'We could not load that image. Please choose another image and try again.';
    imageError.hidden = false;
  });

  function applyImageDimensions(width, height) {
    const ratio = String(imageAspectRatio(width, height));
    previewImage.style.aspectRatio = ratio;
    puzzle.style.aspectRatio = ratio;
  }

  function announce(message) {
    liveStatus.textContent = message;
  }

  function updateTimer() {
    timer.textContent = formatElapsed(performance.now() - startedAt);
  }

  function loadBestRecords() {
    let serialized;
    try {
      serialized = localStorage.getItem(BEST_RECORDS_KEY);
    } catch {
      recordsPersistenceAvailable = false;
      return normalizeBestRecords(null);
    }

    if (!serialized) {
      return normalizeBestRecords(null);
    }

    try {
      return normalizeBestRecords(JSON.parse(serialized));
    } catch {
      return normalizeBestRecords(null);
    }
  }

  function saveBestRecords() {
    try {
      localStorage.setItem(BEST_RECORDS_KEY, JSON.stringify(bestRecords));
      recordsPersistenceAvailable = true;
      return true;
    } catch {
      recordsPersistenceAvailable = false;
      return false;
    }
  }

  function renderBestRecords() {
    const record = bestRecords[selectedSize];
    bestMoves.textContent = record.bestMoves === null ? '—' : String(record.bestMoves);
    bestTime.textContent = record.bestTimeMs === null ? '—' : formatElapsed(record.bestTimeMs);
  }

  function stopTimer() {
    if (timerInterval !== null) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function renderBoard() {
    if (!game) {
      puzzle.replaceChildren();
      return;
    }

    const requiresNewBoard = puzzle.children.length !== game.tiles.length;

    if (requiresNewBoard) {
      puzzle.replaceChildren();
    }

    for (const [index, tile] of game.tiles.entries()) {
      let button = puzzle.children[index];
      const { xPercent, yPercent } = tileBackgroundPosition(tile, game.size);

      if (requiresNewBoard) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'puzzle-piece';
        button.dataset.index = String(index);
        button.style.backgroundSize = `${game.size * 100}% ${game.size * 100}%`;
        button.addEventListener('click', () => {
          if (suppressNextClick) {
            suppressNextClick = false;
            return;
          }
          selectPiece(index);
        });
        button.addEventListener('pointerdown', beginPointerGesture);
        puzzle.append(button);
      }

      button.style.backgroundImage = `url("${currentImageUrl}")`;
      button.style.backgroundPosition = `${xPercent}% ${yPercent}%`;
      button.setAttribute('aria-label', `Piece ${tile + 1}, position ${index + 1} of ${game.size * game.size}`);
      button.setAttribute('aria-pressed', String(game.selectedIndex === index));
      button.classList.toggle('is-selected', game.selectedIndex === index);
      button.disabled = game.status === 'completed';
    }
  }

  function pieceAtPoint(x, y) {
    const element = document.elementFromPoint(x, y)?.closest('.puzzle-piece');
    return element && puzzle.contains(element) ? element : null;
  }

  function clearDragPresentation() {
    dragSourceElement?.classList.remove('is-dragging');
    dragSourceElement?.removeAttribute('aria-grabbed');
    dragTargetElement?.classList.remove('is-drop-target');
    dragSourceElement = null;
    dragTargetElement = null;
  }

  function updateDragPresentation() {
    dragSourceElement?.classList.toggle('is-dragging', dragState?.dragged === true);
    if (dragSourceElement && dragState?.dragged) {
      dragSourceElement.setAttribute('aria-grabbed', 'true');
    }

    const nextTarget = dragState?.dragged && dragState.targetIndex !== null
      ? puzzle.children[dragState.targetIndex]
      : null;
    if (dragTargetElement !== nextTarget) {
      dragTargetElement?.classList.remove('is-drop-target');
      dragTargetElement = nextTarget;
      if (dragTargetElement !== dragSourceElement) {
        dragTargetElement?.classList.add('is-drop-target');
      }
    }
  }

  function beginPointerGesture(event) {
    if (!game || game.status === 'completed' || dragState !== null) {
      return;
    }

    suppressNextClick = false;
    dragSourceElement = event.currentTarget;
    dragState = createDragState(
      Number(dragSourceElement.dataset.index),
      event.pointerId,
      event.clientX,
      event.clientY,
    );
    dragSourceElement.setPointerCapture(event.pointerId);
  }

  puzzle.addEventListener('pointermove', (event) => {
    if (!dragState) {
      return;
    }

    const target = pieceAtPoint(event.clientX, event.clientY);
    dragState = updateDragState(
      dragState,
      event.pointerId,
      event.clientX,
      event.clientY,
      target ? Number(target.dataset.index) : null,
    );
    updateDragPresentation();
  });

  function swapFromDrag(sourceIndex, targetIndex) {
    game = selectTile({ ...game, selectedIndex: null }, sourceIndex);
    game = selectTile(game, targetIndex);
    moves.textContent = String(game.moves);
    renderBoard();
    puzzle.children[sourceIndex]?.focus();

    if (game.status === 'completed') {
      completeGame();
      return;
    }

    announce(`Pieces swapped by drag. ${game.moves} moves.`);
  }

  function endPointerGesture(event, cancelled = false) {
    if (!dragState) {
      return;
    }

    const state = dragState;
    const target = cancelled ? null : pieceAtPoint(event.clientX, event.clientY);
    const action = finishDrag(
      state,
      event.pointerId,
      target ? Number(target.dataset.index) : null,
    );

    if (state.dragged) {
      suppressNextClick = true;
      if (!cancelled) {
        setTimeout(() => {
          suppressNextClick = false;
        }, 0);
      }
    }

    clearDragPresentation();
    dragState = null;

    if (action.type === 'swap') {
      swapFromDrag(action.sourceIndex, action.targetIndex);
    } else if (action.type === 'cancel') {
      announce('Drag cancelled. No pieces were moved.');
    }
  }

  puzzle.addEventListener('pointerup', (event) => endPointerGesture(event));
  puzzle.addEventListener('pointercancel', (event) => endPointerGesture(event, true));
  puzzle.addEventListener('lostpointercapture', (event) => endPointerGesture(event, true));

  function completeGame() {
    stopTimer();
    const elapsedMs = performance.now() - startedAt;
    timer.textContent = formatElapsed(elapsedMs);
    const result = updateBestRecords(bestRecords, selectedSize, game.moves, elapsedMs);
    bestRecords = result.records;
    const recordsSaved = saveBestRecords();
    renderBestRecords();
    finalMoves.textContent = String(game.moves);
    finalTime.textContent = timer.textContent;
    finalDifficulty.textContent = `${selectedSize}×${selectedSize}`;
    const achievements = [
      result.newBestMoves ? 'New best move count!' : '',
      result.newBestTime ? 'New best time!' : '',
      recordsSaved ? '' : 'Best results could not be saved on this device.',
    ].filter(Boolean).join(' ');
    completionAchievements.textContent = achievements;
    completionAchievements.hidden = achievements.length === 0;
    announce(`Puzzle complete in ${game.moves} moves and ${timer.textContent}.${achievements ? ` ${achievements}` : ''}`);
    renderBoard();
    completionDialog.showModal();
  }

  function selectPiece(index) {
    const previousSelection = game.selectedIndex;
    game = selectTile(game, index);
    moves.textContent = String(game.moves);
    renderBoard();

    if (game.status === 'completed') {
      completeGame();
      return;
    }

    if (previousSelection === null) {
      announce(`Position ${index + 1} selected. Choose another piece to swap.`);
    } else if (previousSelection === index) {
      announce('Selection cleared.');
    } else {
      announce(`Pieces swapped. ${game.moves} moves.`);
    }
  }

  function startGame() {
    stopTimer();
    clearDragPresentation();
    dragState = null;
    if (completionDialog.open) {
      completionDialog.close();
    }
    game = createGame(selectedSize);
    startedAt = performance.now();
    moves.textContent = '0';
    updateTimer();
    timerInterval = setInterval(updateTimer, 1_000);
    restartButton.disabled = false;
    puzzle.style.setProperty('--puzzle-size', String(selectedSize));
    puzzle.dataset.size = String(selectedSize);
    puzzle.setAttribute('aria-label', `${selectedSize * selectedSize}-cell ${selectedSize}×${selectedSize} puzzle board`);
    currentDifficulty.textContent = `${selectedSize}×${selectedSize}`;
    renderBestRecords();
    for (const button of difficultyButtons) {
      button.setAttribute('aria-pressed', String(Number(button.dataset.size) === selectedSize));
    }
    renderBoard();
    announce(`New ${selectedSize}×${selectedSize} puzzle started. Select two pieces to swap them.`);
  }

  function selectDifficulty(size) {
    if (size === selectedSize && game) {
      return;
    }
    selectedSize = size;
    startGame();
  }

  function loadUploadedImage(file) {
    if (!isUsableImageFile(file)) {
      imageError.textContent = 'Please choose a non-empty image file.';
      imageError.hidden = false;
      announce('The selected file is not a usable image.');
      return;
    }

    const candidateUrl = URL.createObjectURL(file);
    const candidate = new Image();

    candidate.addEventListener('load', () => {
      if (uploadedImageUrl) {
        URL.revokeObjectURL(uploadedImageUrl);
      }

      uploadedImageUrl = candidateUrl;
      currentImageUrl = candidateUrl;
      previewImage.src = currentImageUrl;
      imageError.hidden = true;
      applyImageDimensions(candidate.naturalWidth, candidate.naturalHeight);
      startGame();
      announce('New image loaded. The puzzle has started.');
    }, { once: true });

    candidate.addEventListener('error', () => {
      URL.revokeObjectURL(candidateUrl);
      imageError.textContent = 'We could not read that image. Please choose another image.';
      imageError.hidden = false;
      announce('The selected image could not be read.');
    }, { once: true });

    candidate.src = candidateUrl;
  }

  restartButton.disabled = true;
  startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', startGame);
  for (const button of difficultyButtons) {
    button.addEventListener('click', () => selectDifficulty(Number(button.dataset.size)));
  }
  replayButton.addEventListener('click', startGame);
  nextDifficultyButton.addEventListener('click', () => {
    const currentIndex = SUPPORTED_SIZES.indexOf(selectedSize);
    selectedSize = SUPPORTED_SIZES[Math.min(currentIndex + 1, SUPPORTED_SIZES.length - 1)];
    startGame();
  });
  uploadButton.addEventListener('click', () => imageUpload.click());
  imageUpload.addEventListener('change', () => {
    const [file] = imageUpload.files;
    imageUpload.value = '';
    if (file) {
      loadUploadedImage(file);
    }
  });
  window.addEventListener('beforeunload', () => {
    if (uploadedImageUrl) {
      URL.revokeObjectURL(uploadedImageUrl);
    }
  });
  renderBestRecords();
}
