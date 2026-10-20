"""Render a seamless six-second ring loop without runtime WebGL."""
import math
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageChops

out = Path(__file__).resolve().parents[1] / 'public/videos'
w, h, fps, seconds = 3840, 2160, 30, 6
scale, segments = 4, 1920
encoder = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{w}x{h}', '-r', str(fps), '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(out / 'dailysupply-rings-4k.mp4')], stdin=subprocess.PIPE)
for frame in range(fps * seconds):
    phase = frame / (fps * seconds) * math.tau
    lines = Image.new('RGB', (w, h))
    draw = ImageDraw.Draw(lines)
    for ring in range(7):
        angle = -.16 + ring * .045 + .035 * math.sin(phase + ring * .6)
        points = []
        for step in range(segments + 1):
            t = step / segments * math.tau
            x = scale * (350 + ring * 6) * math.cos(t)
            y = scale * (92 + ring * 5) * math.sin(t)
            points.append((w/2 + x*math.cos(angle)-y*math.sin(angle), h/2 + x*math.sin(angle)+y*math.cos(angle)))
        for step in range(segments):
            brightness = .25 + .75 * ((math.cos(step/segments*math.tau-phase+ring*.5)+1)/2)**3
            color = tuple(int(c*brightness) for c in (105+ring*12, 145-ring*5, 255))
            draw.line(points[step:step+2], fill=color, width=scale * (2 if ring%3 else 3))
    glow = ImageChops.add(lines.filter(ImageFilter.GaussianBlur(10 * scale)), lines.filter(ImageFilter.GaussianBlur(3 * scale)))
    result = ImageChops.add(Image.new('RGB', (w,h), (5,6,8)), ImageChops.add(lines, glow))
    if frame == 0:
        result.save(out / 'dailysupply-rings-4k-poster.jpg', quality=95)
    encoder.stdin.write(result.tobytes())
encoder.stdin.close()
if encoder.wait():
    raise RuntimeError('Video encoding failed')
