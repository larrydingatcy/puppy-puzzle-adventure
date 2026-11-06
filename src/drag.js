export function createDragState(sourceIndex, pointerId, x, y) {
  return {
    sourceIndex,
    pointerId,
    startX: x,
    startY: y,
    currentX: x,
    currentY: y,
    targetIndex: null,
    dragged: false,
  };
}

export function updateDragState(state, pointerId, x, y, targetIndex, threshold = 8) {
  if (pointerId !== state.pointerId) {
    return state;
  }

  const deltaX = x - state.startX;
  const deltaY = y - state.startY;
  const dragged = state.dragged || (deltaX * deltaX) + (deltaY * deltaY) >= threshold * threshold;

  return {
    ...state,
    currentX: x,
    currentY: y,
    targetIndex: dragged ? targetIndex : null,
    dragged,
  };
}

export function finishDrag(state, pointerId, targetIndex) {
  if (pointerId !== state.pointerId) {
    return { type: 'cancel', sourceIndex: state.sourceIndex, targetIndex: null };
  }

  if (!state.dragged && targetIndex === state.sourceIndex) {
    return { type: 'tap', sourceIndex: state.sourceIndex, targetIndex };
  }

  if (state.dragged && targetIndex !== null && targetIndex !== state.sourceIndex) {
    return { type: 'swap', sourceIndex: state.sourceIndex, targetIndex };
  }

  return { type: 'cancel', sourceIndex: state.sourceIndex, targetIndex };
}
