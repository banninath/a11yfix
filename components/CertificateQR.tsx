"use client";

// This is a visual badge, not a real QR code. Replace with a QR library if needed later.

interface CertificateQRProps {
  id: string;
  size?: number;
}

function createGrid(id: string): boolean[] {
  let hash = 2166136261;
  for (const character of id) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  let seed = hash >>> 0;
  const nextBit = (): boolean => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return (seed & 0x80000000) !== 0;
  };

  const grid = Array.from({ length: 11 * 11 }, nextBit);
  const finder = [
    true, true, true,
    true, false, true,
    true, true, true,
  ];
  const origins = [
    { row: 0, column: 0 },
    { row: 0, column: 8 },
    { row: 8, column: 0 },
  ];

  for (const { row, column } of origins) {
    finder.forEach((isDark, index) => {
      const finderRow = Math.floor(index / 3);
      const finderColumn = index % 3;
      grid[(row + finderRow) * 11 + column + finderColumn] = isDark;
    });
  }

  return grid;
}

export default function CertificateQR({
  id,
  size = 96,
}: CertificateQRProps) {
  const grid = createGrid(id);
  const cellSize = Math.max(1, (size - 16) / 11);

  return (
    <div className="inline-flex shrink-0 flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2">
      <div
        role="img"
        aria-label={`Decorative QR-style certificate badge for ${id}`}
        className="grid grid-cols-11 overflow-hidden rounded-sm bg-white"
        style={{
          width: cellSize * 11,
          height: cellSize * 11,
        }}
      >
        {grid.map((isDark, index) => (
          <span
            key={index}
            aria-hidden="true"
            className={isDark ? "bg-black" : "bg-white"}
          />
        ))}
      </div>
      <span className="whitespace-nowrap text-[10px] font-medium text-[var(--foreground-muted)]">
        Scan · {id.slice(0, 8)}
      </span>
    </div>
  );
}
