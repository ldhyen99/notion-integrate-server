
import { Client } from "@notionhq/client";

const notionDatabaseId = process.env.NOTION_DATABASE_ID;
const notionSecret = process.env.NOTION_SECRET;

if (!notionDatabaseId || !notionSecret) {
  throw Error("Must define NOTION_SECRET and NOTION_DATABASE_ID in env");
}

const notion = new Client({ auth: notionSecret });

const PROPERTY_TYPE_MAPPING = {
  Company: "rich_text",
  Status: "status",
  Priority: "select",
  "Estimated Value": "number",
};

const SUPPORTED_TYPES = [
  "checkbox",
  "date",
  "multi_select",
  "number",
  "rich_text",
  "select",
  "timestamp",
  "status",
];

const SUPPORTED_OPERATORS = {
  checkbox: ["equals", "does_not_equal"],
  date: ["after", "before", "on_or_after", "on_or_before", "is_empty", "is_not_empty"],
  multi_select: ["contains", "does_not_contain", "is_empty", "is_not_empty"],
  number: ["equals", "does_not_equal", "greater_than", "less_than", "is_empty", "is_not_empty"],
  rich_text: ["equals", "does_not_equal", "contains", "does_not_contain", "is_empty", "is_not_empty"],
  select: ["equals", "does_not_equal", "is_empty", "is_not_empty"],
  timestamp: ["after", "before", "on_or_after", "on_or_before"], 
  status: ["equals", "does_not_equal", "is_empty", "is_not_empty"],
};

const VALID_SORT_PROPERTIES = ["Name", "Company", "Status", "Priority", "Estimated Value", "Account Owner"];
const VALID_SORT_DIRECTIONS = ["ascending", "descending"];

function calculateNestingLevel(filter) {
  if (!filter || typeof filter !== "object") return 0;

  const keys = Object.keys(filter);
  if (keys.includes("and") || keys.includes("or")) {
    const subFilters = filter.and || filter.or || [];
    return 1 + Math.max(...subFilters.map(calculateNestingLevel));
  }

  return 0;
}

function validateFilter(filter) {
  if (!filter || typeof filter !== "object") return;

  if (filter.and || filter.or) {
    const subFilters = filter.and || filter.or || [];
    subFilters.forEach(validateFilter);
    return;
  }

  const { property } = filter;
  if (!property) {
    throw new Error("Property is required in filter condition");
  }

  const type = PROPERTY_TYPE_MAPPING[property];
  if (!type || !SUPPORTED_TYPES.includes(type)) {
    throw new Error(`Unsupported property type for ${property}. Supported types: ${SUPPORTED_TYPES.join(", ")}`);
  }

  const conditionType = Object.keys(filter).find((key) => key !== "property");
  const condition = filter[conditionType];
  const operator = Object.keys(condition)[0];

  const supportedOperators = SUPPORTED_OPERATORS[type];
  if (!supportedOperators.includes(operator)) {
    throw new Error(`Unsupported operator '${operator}' for type '${type}' in property '${property}'. Supported operators: ${supportedOperators.join(", ")}`);
  }
}

async function fetchWithFlattenedFilter(filter, sort, maxNestingLevel = 2) {
  validateFilter(filter);
    
  let sortConfig = [];
  if (sort && typeof sort === "object") {
    const { property, direction } = sort;
    if (!property || !VALID_SORT_PROPERTIES.includes(property)) {
      throw new Error(`Invalid sort property: ${property}. Must be one of: ${VALID_SORT_PROPERTIES.join(", ")}`);
    }

    const sortDirection = direction && VALID_SORT_DIRECTIONS.includes(direction) ? direction : "ascending";
    sortConfig = [
      {
        property: property,
        direction: sortDirection,
      },
    ];
  }

    const nestingLevel = filter ? calculateNestingLevel(filter) : 0;
    if (nestingLevel <= maxNestingLevel) {
      if (filter && sortConfig.length > 0) {
        const response = await notion.databases.query({
          database_id: notionDatabaseId,
          filter,
          sorts: sortConfig,
        });
        return response.results;
      }
      else if (filter) {
        const response = await notion.databases.query({
          database_id: notionDatabaseId,
          filter,
        });
        return response.results;
      }
      else if (sortConfig.length > 0) {
        const response = await notion.databases.query({
          database_id: notionDatabaseId,
          sorts: sortConfig,
        });
        return response.results;
      }
      else {
        console.log("Calling Notion API without filter or sort");
        const response = await notion.databases.query({
          database_id: notionDatabaseId,
        });
        return response.results;
      }
    }

  const { and, or } = filter;
  const subFilters = and || or || [];
  const operator = and ? "and" : "or";

  const subResults = await Promise.all(
    subFilters.map(async (subFilter) => {
      return await fetchWithFlattenedFilter(subFilter, maxNestingLevel);
    })
  );

  if (operator === "and") {
    const firstResult = subResults[0];
    return firstResult.filter((row) =>
      subResults.every((resultSet) =>
        resultSet.some((r) => r.id === row.id)
      )
    );
  } else {
    const mergedResults = [];
    const seenIds = new Set();
    for (const resultSet of subResults) {
      for (const row of resultSet) {
        if (!seenIds.has(row.id)) {
          seenIds.add(row.id);
          mergedResults.push(row);
        }
      }
    }
    return mergedResults;
  }
}

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
  
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

  const { filter, maxNestingLevel = 2, sort } = req.body;

  try {
    console.log("Applying filter with max nesting level:", maxNestingLevel);
    const results = await fetchWithFlattenedFilter(filter, sort, maxNestingLevel);
    
    const list = results.map((row, index) => {
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

        return { id: (index+1), name, company, status, priority, estimatedValue, accountOwner };
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
    console.error("Error applying filter:", error.message);
    res.status(500).json({ error: error.message });
  }
}
