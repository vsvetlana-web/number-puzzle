<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { BOARD_SIZE, useGame2048, type Direction } from '../composables/useGame2048'

const { tiles, score, best, isOver, move, reset } = useGame2048()

const backgroundCells = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => i)

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

function onKeydown(event: KeyboardEvent): void {
  const direction = KEY_TO_DIRECTION[event.key]
  if (!direction) return
  event.preventDefault()
  move(direction)
}

const SWIPE_THRESHOLD = 30
let touchStartX = 0
let touchStartY = 0

function onTouchStart(event: TouchEvent): void {
  const touch = event.changedTouches[0]
  touchStartX = touch.clientX
  touchStartY = touch.clientY
}

function onTouchEnd(event: TouchEvent): void {
  const touch = event.changedTouches[0]
  const dx = touch.clientX - touchStartX
  const dy = touch.clientY - touchStartY
  const absX = Math.abs(dx)
  const absY = Math.abs(dy)
  if (Math.max(absX, absY) < SWIPE_THRESHOLD) return
  if (absX > absY) {
    move(dx > 0 ? 'right' : 'left')
  } else {
    move(dy > 0 ? 'down' : 'up')
  }
}

function tileTransform(row: number, col: number): string {
  // percentages here resolve against the tile's own (square) size = one cell,
  // so one step is `100% + gap`; keeps tiles locked to the 1fr background grid
  const stepX = `calc((100% + var(--gap)) * ${col})`
  const stepY = `calc((100% + var(--gap)) * ${row})`
  return `translate(${stepX}, ${stepY})`
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="game">
    <header class="game__header">
      <div class="game__brand">
        <h1 class="game__title">2048</h1>
        <p class="game__subtitle">Собери плитку 2048</p>
      </div>
      <div class="game__scores">
        <div class="score">
          <span class="score__label">Счёт</span>
          <span class="score__value">{{ score }}</span>
        </div>
        <div class="score">
          <span class="score__label">Рекорд</span>
          <span class="score__value">{{ best }}</span>
        </div>
      </div>
    </header>

    <div class="game__toolbar">
      <p class="game__hint">Стрелки на клавиатуре или свайп по полю</p>
      <button class="btn" type="button" @click="reset">Новая игра</button>
    </div>

    <div
      class="board"
      @touchstart.passive="onTouchStart"
      @touchend="onTouchEnd"
    >
      <div class="board__grid">
        <div v-for="cell in backgroundCells" :key="cell" class="board__cell" />
      </div>

      <div class="board__tiles">
        <div
          v-for="tile in tiles"
          :key="tile.id"
          class="tile"
          :class="{
            'tile--new': tile.isNew,
            'tile--merged': tile.justMerged,
            'tile--away': tile.mergedAway,
          }"
          :data-value="tile.value"
          :style="{ transform: tileTransform(tile.row, tile.col) }"
        >
          <span class="tile__inner">{{ tile.value }}</span>
        </div>
      </div>

      <Transition name="overlay">
        <div v-if="isOver" class="overlay">
          <p class="overlay__title">Игра окончена</p>
          <p class="overlay__score">Финальный счёт: {{ score }}</p>
          <button class="btn btn--accent" type="button" @click="reset">
            Начать заново
          </button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.game {
  --gap: min(2.6vw, 14px);
  --tile-radius: 6px;
  width: min(94vw, 430px);
  max-width: 100%;
  margin: 0 auto;
}

.game__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.game__title {
  margin: 0;
  font-size: clamp(36px, 11vw, 56px);
  font-weight: 800;
  color: #776e65;
  line-height: 1;
}

.game__subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: #8f7a66;
}

.game__scores {
  display: flex;
  gap: 8px;
}

.score {
  min-width: 74px;
  padding: 6px 12px;
  border-radius: 6px;
  background: #bbada0;
  text-align: center;
  color: #eee4da;
}

.score__label {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.score__value {
  display: block;
  margin-top: 2px;
  font-size: 22px;
  font-weight: 800;
  color: #fff;
}

.game__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.game__hint {
  margin: 0;
  font-size: 12px;
  color: #8f7a66;
}

.btn {
  border: 0;
  border-radius: 6px;
  padding: 10px 18px;
  background: #8f7a66;
  color: #f9f6f2;
  font: inherit;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: filter 120ms ease, transform 80ms ease;
}

.btn:hover {
  filter: brightness(1.06);
}

.btn:active {
  transform: translateY(1px);
}

.btn--accent {
  background: #f67c5f;
}

.board {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  padding: var(--gap);
  border-radius: 10px;
  background: #bbada0;
  touch-action: none;
  overflow: hidden;
}

.board__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 1fr);
  gap: var(--gap);
  width: 100%;
  height: 100%;
}

.board__cell {
  border-radius: var(--tile-radius);
  background: rgba(238, 228, 218, 0.35);
}

.board__tiles {
  position: absolute;
  inset: var(--gap);
}

.tile {
  position: absolute;
  top: 0;
  left: 0;
  width: calc((100% - 3 * var(--gap)) / 4);
  height: calc((100% - 3 * var(--gap)) / 4);
  z-index: 2;
  transition: transform 130ms ease-in-out;
  will-change: transform;
}

.tile--away {
  z-index: 1;
}

.tile__inner {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: var(--tile-radius);
  font-size: clamp(20px, 6vw, 34px);
  font-weight: 700;
  color: #f9f6f2;
  background: #3c3a32;
  transition: background 120ms ease, color 120ms ease;
}

.tile--new .tile__inner {
  animation: tile-appear 150ms ease;
}

.tile--merged .tile__inner {
  animation: tile-pop 170ms ease;
}

.tile[data-value='2'] .tile__inner {
  background: #eee4da;
  color: #776e65;
}

.tile[data-value='4'] .tile__inner {
  background: #ede0c8;
  color: #776e65;
}

.tile[data-value='8'] .tile__inner {
  background: #f2b179;
}

.tile[data-value='16'] .tile__inner {
  background: #f59563;
}

.tile[data-value='32'] .tile__inner {
  background: #f67c5f;
}

.tile[data-value='64'] .tile__inner {
  background: #f65e3b;
}

.tile[data-value='128'] .tile__inner {
  background: #edcf72;
  font-size: clamp(17px, 5vw, 28px);
}

.tile[data-value='256'] .tile__inner {
  background: #edcc61;
  font-size: clamp(17px, 5vw, 28px);
}

.tile[data-value='512'] .tile__inner {
  background: #edc850;
  font-size: clamp(17px, 5vw, 28px);
}

.tile[data-value='1024'] .tile__inner {
  background: #edc53f;
  font-size: clamp(14px, 4.2vw, 24px);
}

.tile[data-value='2048'] .tile__inner {
  background: #edc22e;
  font-size: clamp(14px, 4.2vw, 24px);
}

.overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  border-radius: 10px;
  background: rgba(238, 228, 218, 0.78);
  text-align: center;
}

.overlay__title {
  margin: 0;
  font-size: clamp(28px, 8vw, 44px);
  font-weight: 800;
  color: #776e65;
}

.overlay__score {
  margin: 0;
  font-size: 16px;
  color: #776e65;
}

.overlay-enter-active {
  transition: opacity 240ms ease;
}

.overlay-enter-from {
  opacity: 0;
}

@keyframes tile-appear {
  from {
    opacity: 0;
    transform: scale(0.3);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes tile-pop {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.18);
  }
  100% {
    transform: scale(1);
  }
}

@media (max-width: 420px) {
  .game__header {
    flex-direction: column;
    align-items: stretch;
  }

  .game__scores {
    justify-content: flex-start;
  }
}
</style>
