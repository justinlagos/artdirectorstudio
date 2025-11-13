import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";

GlobalWorkerOptions.workerSrc = workerSrc;

const MAX_EXTRACTED_CHARACTERS = 20000;

const cleanText = (input: string) =>
  input
    .split("\u0000")
    .join("")
    .replace(/\s+/g, " ")
    .trim();

export const extractTextFromPdf = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  let combinedText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");

    combinedText += `${pageText}\n\n`;

    if (combinedText.length >= MAX_EXTRACTED_CHARACTERS) {
      combinedText = combinedText.slice(0, MAX_EXTRACTED_CHARACTERS);
      break;
    }
  }

  return cleanText(combinedText);
};

export const extractTextFromDocx = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  return cleanText(value || "");
};

export const extractTextFromBriefFile = async (file: File) => {
  if (file.type === "application/pdf") {
    return extractTextFromPdf(file);
  }

  if (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.type === "application/msword"
  ) {
    return extractTextFromDocx(file);
  }

  throw new Error("Unsupported brief file type");
};

