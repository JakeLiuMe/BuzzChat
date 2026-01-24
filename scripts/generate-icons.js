/**
 * Generate PNG icons from SVG
 * Run: node scripts/generate-icons.js
 *
 * Requires: npm install sharp
 */

const fs = require('fs');
const path = require('path');

async function generateIcons() {
  try {
    // Try to use sharp if available
    const sharp = require('sharp');

    const svgPath = path.join(__dirname, '../assets/icons/icon.svg');
    const svgBuffer = fs.readFileSync(svgPath);

    const sizes = [16, 48, 128];

    for (const size of sizes) {
      const outputPath = path.join(__dirname, `../assets/icons/icon${size}.png`);

      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log(`Generated: icon${size}.png`);
    }

    console.log('All icons generated successfully!');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('Sharp not installed. Creating placeholder icons...');
      createPlaceholderIcons();
    } else {
      console.error('Error generating icons:', error);
      console.log('Creating placeholder icons instead...');
      createPlaceholderIcons();
    }
  }
}

function createPlaceholderIcons() {
  // Create simple colored square placeholders
  // These are minimal valid PNG files
  const sizes = [16, 48, 128];

  for (const size of sizes) {
    const outputPath = path.join(__dirname, `../assets/icons/icon${size}.png`);

    // Create a simple PNG (purple square)
    const png = createSimplePNG(size, [124, 58, 237]); // Purple color

    fs.writeFileSync(outputPath, png);
    console.log(`Created placeholder: icon${size}.png`);
  }

  console.log('\nPlaceholder icons created!');
  console.log('For better icons, install sharp: npm install sharp');
  console.log('Then run: node scripts/generate-icons.js');
}

function createSimplePNG(size, color) {
  // Create a minimal PNG file
  // This creates a solid color square

  const width = size;
  const height = size;

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);  // bit depth
  ihdrData.writeUInt8(2, 9);  // color type (RGB)
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT chunk (image data)
  const rawData = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 3 + 1);
    rawData[rowStart] = 0; // filter byte
    for (let x = 0; x < width; x++) {
      const pixelStart = rowStart + 1 + x * 3;
      rawData[pixelStart] = color[0];     // R
      rawData[pixelStart + 1] = color[1]; // G
      rawData[pixelStart + 2] = color[2]; // B
    }
  }

  const zlib = require('zlib');
  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type);
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

generateIcons();
