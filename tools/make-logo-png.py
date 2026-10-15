"""Write logo.png from the header logo embedded in index.html.

The embedded logo is 711x110. Search engines ask for at least 112px on each
side, so this adds a transparent margin. index.html itself is only read.

Usage (from the site folder):  python -I tools/make-logo-png.py
Standard library only.
"""
import base64
import re
import struct
import zlib

SOURCE = "index.html"
TARGET = "logo.png"
MARGIN = 20  # px of transparent padding on every side


def read_embedded_logo(html):
    # The first <img class="logo"> is the header version (dark text on transparent).
    m = re.search(r'<img class="logo" src="data:image/png;base64,([^"]+)"', html)
    if not m:
        raise SystemExit("header logo not found in index.html")
    return base64.b64decode(m.group(1))


def chunks(png):
    pos = 8
    while pos < len(png):
        length, ctype = struct.unpack(">I4s", png[pos:pos + 8])
        yield ctype, png[pos + 8:pos + 8 + length]
        pos += 12 + length


def paeth(a, b, c):
    p = a + b - c
    pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    return b if pb <= pc else c


def decode_rgba(png):
    idat = b""
    for ctype, data in chunks(png):
        if ctype == b"IHDR":
            w, h, depth, color, _, _, interlace = struct.unpack(">IIBBBBB", data)
            if (depth, color, interlace) != (8, 6, 0):
                raise SystemExit("expected 8-bit RGBA, non-interlaced PNG")
        elif ctype == b"IDAT":
            idat += data
    raw = zlib.decompress(idat)
    bpp, stride = 4, w * 4
    rows, prev, pos = [], bytearray(stride), 0
    for _ in range(h):
        ftype, line = raw[pos], bytearray(raw[pos + 1:pos + 1 + stride])
        pos += 1 + stride
        for i in range(stride):
            a = line[i - bpp] if i >= bpp else 0
            b = prev[i]
            c = prev[i - bpp] if i >= bpp else 0
            if ftype == 1:
                line[i] = (line[i] + a) & 0xFF
            elif ftype == 2:
                line[i] = (line[i] + b) & 0xFF
            elif ftype == 3:
                line[i] = (line[i] + ((a + b) >> 1)) & 0xFF
            elif ftype == 4:
                line[i] = (line[i] + paeth(a, b, c)) & 0xFF
        rows.append(bytes(line))
        prev = line
    return w, h, rows


def encode_rgba(w, h, rows):
    def chunk(ctype, data):
        body = ctype + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    raw = b"".join(b"\x00" + r for r in rows)
    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9))
            + chunk(b"IEND", b""))


def main():
    html = open(SOURCE, encoding="utf-8").read()
    w, h, rows = decode_rgba(read_embedded_logo(html))
    clear = b"\x00" * 4
    side = clear * MARGIN
    blank = clear * (w + 2 * MARGIN)
    padded = [blank] * MARGIN + [side + r + side for r in rows] + [blank] * MARGIN
    nw, nh = w + 2 * MARGIN, h + 2 * MARGIN
    open(TARGET, "wb").write(encode_rgba(nw, nh, padded))
    print(f"wrote {TARGET}: {nw}x{nh} (from {w}x{h})")


if __name__ == "__main__":
    main()
