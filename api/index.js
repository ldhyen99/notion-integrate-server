import { Client } from "@notionhq/client";
import { v4 as uuidv4 } from 'uuid';

const notionDatabaseId = process.env.NOTION_DATABASE_ID;
const notionSecret = process.env.NOTION_SECRET;

if (!notionDatabaseId || !notionSecret) {
  throw Error("Must define NOTION_SECRET and NOTION_DATABASE_ID in env");
}

const notion = new Client({ auth: notionSecret });

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.url === "/api" || req.url === "/api/") {
    try {
      console.log("Querying Notion API...");
      const query = await notion.databases.query({
        database_id: notionDatabaseId,
      });
      console.log("Notion API response:", query.results);

      const list = query.results.map((row) => {
        const nameCell = row.properties["Name"];
        const CompanyCell = row.properties["Company"];
        const statusCell = row.properties["Status"];
        const priorityCell = row.properties["Priority"];
        const estimatedValueCell = row.properties["Estimated Value"];
        const accountOwnerCell = row.properties["Account Owner"];

        const isLabel = nameCell.type === "title";
        const isCompany = CompanyCell.type === "rich_text";
        const isStatus = statusCell.type === "select";
        const isPriority = priorityCell.type === "select";
        const isEstimatedValue = estimatedValueCell.type === "number";
        const isAccountOwner = accountOwnerCell.type === "people";

        if (isLabel && isCompany && isStatus && isPriority && isEstimatedValue && isAccountOwner) {
          const name = nameCell.title?.[0].plain_text ?? "";
          const company = CompanyCell.rich_text?.[0].plain_text ?? "";
          const status = statusCell.select?.name ?? "";
          const priority = priorityCell.select?.name ?? "";
          const estimatedValue = estimatedValueCell.number ?? 0;
          const accountOwner = accountOwnerCell.people?.[0].object ?? "";

          return { id: uuidv4(), name, company, status, priority, estimatedValue, accountOwner };
        }

        return {
          id: "",
          name: "NOT_FOUND",
          company: "NOT_FOUND",
          status: "NOT_FOUND",
          priority: "NOT_FOUND",
          estimatedValue: 0,
          accountOwner: "NOT_FOUND",
        };
      });

      res.status(200).json(list);
    } catch (error) {
      console.error("Error querying Notion API:", error.message);
      res.status(500).json({ error: "Failed to fetch data from Notion API" });
    }
  } else {
    res.status(404).json({ error: "Resource not found" });
  }
}