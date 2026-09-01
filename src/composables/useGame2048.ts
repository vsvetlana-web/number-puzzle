import { readonly, ref } from 'vue'

export type Direction = 'up' | 'down' | 'left' | 'right'

export interface Tile {
  /** stable identity, used as the v-for key so the DOM node is reused and can transition */
  id: number
  value: number
  row: number
  col: number
  /** just spawned this turn — plays the appear animation */
  isNew: boolean
  /** result of a merge this turn — plays the pop animation */
  justMerged: boolean
  /** merged into another tile: slides to the target cell, then gets removed */
  mergedAway: boolean
}

export const BOARD_SIZE = 4

/** must match the CSS transition duration of `.tile` */
const SLIDE_MS = 130

const BEST_KEY = 'number-puzzle-best'

type Cell = Tile | null
type Grid = Cell[][]

const VECTORS: Record<Direction, { dr: number; dc: number }> = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
}

function readBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}

function writeBest(value: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(value))
  } catch {
    /* storage unavailable — best score just won't persist */
  }
}

export function useGame2048() {
  const tiles = ref<Tile[]>([])
  const score = ref(0)
  const best = ref(readBest())
  const isOver = ref(false)

  let nextId = 1
  let removalTimer: ReturnType<typeof setTimeout> | null = null

  function createTile(value: number, row: number, col: number, isNew: boolean): Tile {
    return { id: nextId++, value, row, col, isNew, justMerged: false, mergedAway: false }
  }

  /** live 4x4 view of the board, ignoring tiles that are on their way out */
  function buildGrid(): Grid {
    const grid: Grid = Array.from({ length: BOARD_SIZE }, () =>
      Array<Cell>(BOARD_SIZE).fill(null),
    )
    for (const tile of tiles.value) {
      if (!tile.mergedAway) grid[tile.row][tile.col] = tile
    }
    return grid
  }

  function emptyCells(grid: Grid): Array<{ row: number; col: number }> {
    const cells: Array<{ row: number; col: number }> = []
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (!grid[r][c]) cells.push({ row: r, col: c })
      }
    }
    return cells
  }

  function spawnTile(): void {
    const cells = emptyCells(buildGrid())
    if (cells.length === 0) return
    const spot = cells[Math.floor(Math.random() * cells.length)]
    const value = Math.random() < 0.9 ? 2 : 4
    tiles.value.push(createTile(value, spot.row, spot.col, true))
  }

  /** drop tiles that already finished their merge-out slide */
  function flushRemovals(): void {
    if (removalTimer !== null) {
      clearTimeout(removalTimer)
      removalTimer = null
    }
    if (tiles.value.some((tile) => tile.mergedAway)) {
      tiles.value = tiles.value.filter((tile) => !tile.mergedAway)
    }
  }

  function movesAvailable(grid: Grid): boolean {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cell = grid[r][c]
        if (!cell) return true
        if (c < BOARD_SIZE - 1 && grid[r][c + 1]?.value === cell.value) return true
        if (r < BOARD_SIZE - 1 && grid[r + 1][c]?.value === cell.value) return true
      }
    }
    return false
  }

  function inBounds(r: number, c: number): boolean {
    return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE
  }

  /**
   * Cell visiting order: tiles nearest the target wall move first so a tile
   * that has already merged this turn is skipped as a merge target for the next one.
   */
  function traversalOrder(dir: Direction): Array<{ r: number; c: number }> {
    const base = [0, 1, 2, 3]
    const rows = dir === 'down' ? [...base].reverse() : base
    const cols = dir === 'right' ? [...base].reverse() : base
    const order: Array<{ r: number; c: number }> = []
    for (const r of rows) {
      for (const c of cols) order.push({ r, c })
    }
    return order
  }

  function move(dir: Direction): boolean {
    if (isOver.value) return false
    flushRemovals()

    for (const tile of tiles.value) {
      tile.isNew = false
      tile.justMerged = false
    }

    const { dr, dc } = VECTORS[dir]
    const grid = buildGrid()
    const mergedHere: boolean[][] = Array.from({ length: BOARD_SIZE }, () =>
      Array<boolean>(BOARD_SIZE).fill(false),
    )
    let moved = false

    for (const { r, c } of traversalOrder(dir)) {
      const tile = grid[r][c]
      if (!tile) continue

      // slide as far as possible
      let nr = r
      let nc = c
      while (inBounds(nr + dr, nc + dc) && !grid[nr + dr][nc + dc]) {
        nr += dr
        nc += dc
      }

      // tile blocking the way — merge if it matches and hasn't merged yet
      const br = nr + dr
      const bc = nc + dc
      const blocker = inBounds(br, bc) ? grid[br][bc] : null

      if (blocker && blocker.value === tile.value && !mergedHere[br][bc]) {
        grid[r][c] = null
        mergedHere[br][bc] = true
        blocker.value *= 2
        blocker.justMerged = true
        score.value += blocker.value
        tile.mergedAway = true
        tile.row = br
        tile.col = bc
        moved = true
      } else if (nr !== r || nc !== c) {
        grid[r][c] = null
        grid[nr][nc] = tile
        tile.row = nr
        tile.col = nc
        moved = true
      }
    }

    if (!moved) return false

    if (score.value > best.value) {
      best.value = score.value
      writeBest(best.value)
    }

    removalTimer = setTimeout(() => {
      tiles.value = tiles.value.filter((tile) => !tile.mergedAway)
      removalTimer = null
    }, SLIDE_MS)

    spawnTile()

    if (!movesAvailable(buildGrid())) {
      isOver.value = true
    }

    return true
  }

  function reset(): void {
    flushRemovals()
    tiles.value = []
    score.value = 0
    isOver.value = false
    nextId = 1
    spawnTile()
    spawnTile()
  }

  reset()

  return {
    tiles: readonly(tiles),
    score: readonly(score),
    best: readonly(best),
    isOver: readonly(isOver),
    move,
    reset,
  }
}
