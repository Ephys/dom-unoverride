// const placeholders = [];

export function getPlaceholder() {
  return makePlaceholder();
}

export function freePlaceholder() {
  // TODO placeholder cache?
}

function makePlaceholder() {
  const placeholder = document.createElement('div');
  placeholder.style.display = 'none';

  return placeholder;
}
