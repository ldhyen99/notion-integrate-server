if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

import http from "http";
import { Client } from "@notionhq/client";
import { v4 as uuidv4 } from 'uuid';

interface SalesCMS {
  name: string;
  company: string;
  status: string
  priority: string
  estimatedValue: number
  accountOwner: string
}

const notionDatabaseId = process.env.NOTION_DATABASE_ID || "default_database_id";
const notionSecret = process.env.NOTION_SECRET || "default_secret";

if (!notionDatabaseId || !notionSecret) {
  throw Error("Must define NOTION_SECRET and NOTION_DATABASE_ID in env");
}

const notion = new Client({
  auth: notionSecret,
});

const host = process.env.HOST || "localhost";
const port = parseInt(process.env.PORT || "8000");


const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  switch (req.url) {
    case "/data": {
      const query = await notion.databases.query({
        database_id: notionDatabaseId,
      });

      const list: SalesCMS[] = query.results.map((row) => {
        
        const nameCell = row.properties['Name'];
        const CompanyCell = row.properties['Company'];
        const statusCell = row.properties['Status'];
        const priorityCell = row.properties['Priority'];
        const estimatedValueCell = row.properties['Estimated Value'];
        const accountOwnerCell = row.properties['Account Owner'];


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
          console.log({row});
          
          return {
            id: uuidv4(),
            name,
            company,
            status,
            priority,
            estimatedValue,
            accountOwner,
          }
        }

        return {
          id: "",
          name: "NOT_FOUND",
          company: "NOT_FOUND",
          status: "NOT_FOUND",
          priority: "NOT_FOUND",
          estimatedValue: 0,
          accountOwner: "NOT_FOUND",
        }
      });

      res.setHeader("Content-Type", "application/json");
      res.writeHead(200);
      res.end(JSON.stringify(list));
      break;
    }

    default:
      res.setHeader("Content-Type", "application/json");
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Resource not found" }));
  }

});server.listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
});
