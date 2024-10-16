import { Image } from 'https://deno.land/x/imagescript@1.2.15/mod.ts';

interface ProcessOptions {
  maxWidth: number;
  maxSizeKB: number;
  outputFormat: 'jpg' | 'png';
  inputDir: string;
  outputDir: string;
}

async function processImage(inputPath: string, outputPath: string, options: ProcessOptions): Promise<void> {
  const fileContent = await Deno.readFile(inputPath);
  let image = await Image.decode(fileContent);

  // Resize if necessary
  if (image.width > options.maxWidth) {
    const scaleFactor = options.maxWidth / image.width;
    image = image.resize(options.maxWidth, Math.round(image.height * scaleFactor));
  }

  // Process the image
  let quality = 80;
  let output: Uint8Array;

  do {
    if (options.outputFormat === 'jpg') {
      output = await image.encodeJPEG(quality);
    } else {
      output = await image.encode();
    }
    quality -= 5;
  } while (output.length > options.maxSizeKB * 1024 && quality > 10);

  await Deno.writeFile(outputPath, output);
}

async function processImages(options: ProcessOptions): Promise<void> {
  try {
    await Deno.mkdir(options.outputDir, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error;
    }
  }

  for await (const dirEntry of Deno.readDir(options.inputDir)) {
    if (dirEntry.isFile && /\.(jpg|jpeg|png)$/i.test(dirEntry.name)) {
      const inputPath = `${options.inputDir}/${dirEntry.name}`;
      const outputPath = `${options.outputDir}/${dirEntry.name.split('.')[0]}.${options.outputFormat}`;

      try {
        await processImage(inputPath, outputPath, options);
        console.log(`Processed: ${dirEntry.name}`);
      } catch (error) {
        console.error(`Error processing ${dirEntry.name}:`, error);
      }
    }
  }
}

// Example usage
const options: ProcessOptions = {
  maxWidth: 1000,
  maxSizeKB: 500,
  outputFormat: 'jpg',
  inputDir: './input',
  outputDir: './output',
};

processImages(options).then(() => {
  console.log('All images processed');
}).catch((error) => {
  console.error('Error:', error);
});
