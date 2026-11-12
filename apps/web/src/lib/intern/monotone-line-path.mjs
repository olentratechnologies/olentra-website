function endpointSlope(firstWidth, nextWidth, firstSlope, nextSlope) {
  let slope =
    ((2 * firstWidth + nextWidth) * firstSlope - firstWidth * nextSlope) /
    (firstWidth + nextWidth);

  if (Math.sign(slope) !== Math.sign(firstSlope)) return 0;
  if (
    Math.sign(firstSlope) !== Math.sign(nextSlope) &&
    Math.abs(slope) > Math.abs(3 * firstSlope)
  ) {
    slope = 3 * firstSlope;
  }
  return slope;
}

export function monotoneLinePath(points) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const widths = [];
  const secants = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const width = points[index + 1].x - points[index].x;
    widths.push(width);
    secants.push(
      width === 0 ? 0 : (points[index + 1].y - points[index].y) / width,
    );
  }

  const tangents = Array(points.length).fill(0);
  if (points.length === 2) {
    tangents[0] = secants[0];
    tangents[1] = secants[0];
  } else {
    tangents[0] = endpointSlope(widths[0], widths[1], secants[0], secants[1]);
    const last = points.length - 1;
    tangents[last] = endpointSlope(
      widths[last - 1],
      widths[last - 2],
      secants[last - 1],
      secants[last - 2],
    );

    for (let index = 1; index < last; index += 1) {
      const previous = secants[index - 1];
      const next = secants[index];
      if (previous === 0 || next === 0 || Math.sign(previous) !== Math.sign(next)) {
        tangents[index] = 0;
        continue;
      }

      const previousWidth = widths[index - 1];
      const nextWidth = widths[index];
      const firstWeight = 2 * nextWidth + previousWidth;
      const secondWeight = nextWidth + 2 * previousWidth;
      tangents[index] =
        (firstWeight + secondWeight) /
        (firstWeight / previous + secondWeight / next);
    }

    for (let index = 0; index < secants.length; index += 1) {
      const slope = secants[index];
      if (slope === 0) {
        tangents[index] = 0;
        tangents[index + 1] = 0;
        continue;
      }

      const alpha = tangents[index] / slope;
      const beta = tangents[index + 1] / slope;
      const magnitude = alpha * alpha + beta * beta;
      if (magnitude > 9) {
        const scale = 3 / Math.sqrt(magnitude);
        tangents[index] = scale * alpha * slope;
        tangents[index + 1] = scale * beta * slope;
      }
    }
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const width = widths[index];
    const lowerY = Math.min(current.y, next.y);
    const upperY = Math.max(current.y, next.y);
    const control1Y = Math.min(
      upperY,
      Math.max(lowerY, current.y + (tangents[index] * width) / 3),
    );
    const control2Y = Math.min(
      upperY,
      Math.max(lowerY, next.y - (tangents[index + 1] * width) / 3),
    );
    path += ` C ${current.x + width / 3} ${control1Y}, ${next.x - width / 3} ${control2Y}, ${next.x} ${next.y}`;
  }
  return path;
}
