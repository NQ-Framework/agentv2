import { DOMParser, HTMLDocument } from "../deps.ts";
import type { FiscalArticle } from "./fiscal-article.model.ts";
import { fiscalFieldNameMap } from "./general-fiscal-data.model.ts";
import type { GeneralFiscalData } from "./general-fiscal-data.model.ts";
import type { FiscalDetails, TaxDetails } from "./fiscal-details.model.ts";
import type { FiscalReceipt } from "./fiscal-receipt.model.ts";

export const parseFiscalHtml = (html: string): FiscalReceipt => {
  const root = new DOMParser().parseFromString(html, "text/html");
  if (!root) {
    throw Error("Could not parse fiscal html");
  }
  const generalFiscalData = parseGeneralFiscalData(root);
  const { articles, fiscalDetails, qrImageUrl } = parseFiscalDetails(root);

  return {
    articles,
    generalFiscalData,
    fiscalDetails,
    qrImageUrl,
  };
};

const parseGeneralFiscalData = (root: HTMLDocument): GeneralFiscalData => {
  const elements = Array.from(root.querySelectorAll(".col-form-label"));

  const fiscalData: GeneralFiscalData = elements.reduce((data: any, e) => {
    const name = e.textContent.trim();
    const value = e.nextSibling?.textContent.trim();
    const keyName = fiscalFieldNameMap[name];
    data[keyName] = value;
    return data;
  }, {});
  fiscalData.total = parseFloat(
    fiscalData.totalText.replace(".", "").replace(",", ".")
  );
  return fiscalData;
};

const parseFiscalDetails = (
  root: HTMLDocument
): {
  articles: FiscalArticle[];
  qrImageUrl: string;
  fiscalDetails: FiscalDetails;
} => {
  const text = root.getElementsByTagName("pre")[0].innerHTML;
  const articles = parseFiscalArticles(text);
  const qrImageUrl = parseQrImageUrl(text);
  const fiscalDetails = parseFiscalDetailsData(text);
  return { articles, qrImageUrl, fiscalDetails };
};

const parseFiscalArticles = (detailsText: string): FiscalArticle[] => {
  const parts = detailsText.split(
    "========================================<br/>"
  );
  const text = parts[0];
  const lines = text.split(/\r?\n/);
  const articlesIndex = lines.indexOf("Артикли") + 3;
  const articleLines = lines.slice(articlesIndex);
  const articles: FiscalArticle[] = [];
  for (let i = 0; i < articleLines.length; i += 2) {
    if (articleLines[i] === "----------------------------------------") {
      break;
    }
    const articleNameAndTaxMark = articleLines[i].trim();
    const articleTaxMarkWithBrackets =
      articleNameAndTaxMark.split(" ").at(-1) ?? "";
    const name = articleLines[i]
      .replace(`${articleTaxMarkWithBrackets}`, "")
      .trim();
    const taxMark = articleTaxMarkWithBrackets
      .replace("(", "")
      .replace(")", "");

    const line = articleLines[i + 1].trim();
    const [price, quantity, total] = line
      .split(" ")
      .filter((x) => x !== "")
      .map((x) => parseFloat(x.replace(".", "").replace(",", ".")));
    articles.push({
      name,
      taxMark,
      quantity,
      price,
      total,
    });
  }
  return articles;
};

const parseQrImageUrl = (detailsText: string): string => {
  const regex = /data:image[^"]*/gm;
  console.log("details Text ends with", detailsText.slice(-100));
  const match = detailsText.match(regex);
  if (!match) {
    throw Error("Could not parse qr image url");
  }
  return match[0];
};

export const parseFiscalDetailsData = (detailsText: string): FiscalDetails => {
  const lines = detailsText.split(/\r?\n/);
  const companyName = lines[2].trim();
  const checkoutOperatorLine = lines.find((l) => l.startsWith("Касир:"));
  if (!checkoutOperatorLine) {
    throw new Error("Invalid fiscal data, checkout operator line not found");
  }
  const checkoutOperator = checkoutOperatorLine.replace("Касир:", "").trim();
  const esirLine = lines.find((l) => l.startsWith("ЕСИР број:"));
  if (!esirLine) {
    throw new Error("Invalid fiscal data, esir line not found");
  }
  const esirNumber = esirLine.replace("ЕСИР број:", "").trim();
  const totalTaxLine = lines.find((l) => l.startsWith("Укупан износ пореза:"));
  if (!totalTaxLine) {
    throw new Error("Invalid fiscal data, cannot find total tax line");
  }
  const totalTax = parseFloat(
    totalTaxLine
      .replace("Укупан износ пореза:", "")
      .trim()
      .replace(".", "")
      .replace(",", ".")
  );
  const taxStartLine = lines.find((l) => l.startsWith("Ознака       Име"));
  if (!taxStartLine) {
    throw new Error("invalid fiscal data, cannot parse tax details");
  }
  const taxStartIndex = lines.indexOf(taxStartLine) + 1; //?
  let index = taxStartIndex;
  let line = lines[index];
  const taxDetails: TaxDetails[] = [];
  while (
    index < lines.length &&
    line !== "----------------------------------------"
  ) {
    const parts = line.split(" ").filter((x) => x !== "");
    const [mark, name, rate, amount] = parts;
    taxDetails.push({
      mark,
      name,
      percentageRate: parseFloat(
        rate.replace(".", "").replace(",", ".").replace("%", "")
      ),
      amount: parseFloat(amount.replace(".", "").replace(",", ".")),
    });
    index++;
    line = index < lines.length ? lines[index] : "";
  }
  if (index === lines.length) {
    throw new Error(
      "invalid fiscal data, cannot parse tax details, end line not found"
    );
  }
  return {
    companyName,
    checkoutOperator,
    esirNumber,
    taxDetails,
    totalTax,
  };
};
