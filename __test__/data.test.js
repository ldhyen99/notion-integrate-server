const test = require("node:test");
const assert = require("node:assert").strict;

process.env.NOTION_DATABASE_ID = "mock-database-id";
process.env.NOTION_SECRET = "mock-secret";

const mockQueryResults = [
  {
    id: "1",
    properties: {
      Name: { type: "title", title: [{ plain_text: "Deal 1" }] },
      Company: { type: "rich_text", rich_text: [{ plain_text: "Acme Corp" }] },
      Status: { type: "select", select: { name: "Active" } },
      Priority: { type: "select", select: { name: "High" } },
      "Estimated Value": { type: "number", number: 1000 },
      "Account Owner": { type: "people", people: [{ object: "user1" }] },
    },
  },
  {
    id: "2",
    properties: {
      Name: { type: "title", title: [{ plain_text: "Deal 2" }] },
      Company: { type: "rich_text", rich_text: [{ plain_text: "Beta Inc" }] },
      Status: { type: "select", select: { name: "Pending" } },
      Priority: { type: "select", select: { name: "Low" } },
      "Estimated Value": { type: "number", number: 500 },
      "Account Owner": { type: "people", people: [{ object: "user2" }] },
    },
  },
];

const mockNotionModule = {
  Client: function () {
    return {
      databases: {
        query: async () => ({ results: mockQueryResults }),
      },
    };
  },
};

// Lưu module gốc và thay thế bằng mock
const originalModule = require("@notionhq/client");
require.cache[require.resolve("@notionhq/client")] = {
  exports: mockNotionModule,
};

const { calculateNestingLevel, validateFilter, fetchWithFlattenedFilter } = require("../api/data");

function createMockRequest(body) {
  return {
    method: "POST",
    body,
  };
}

function createMockResponse() {
  let statusCode = 200;
  let responseData = null;
  return {
    setHeader: () => {},
    status: (code) => {
      statusCode = code;
      return this;
    },
    json: (data) => {
      responseData = data;
      return this;
    },
    end: () => {},
    getStatus: () => statusCode,
    getData: () => responseData,
  };
}

test.describe("calculateNestingLevel", () => {
  test("should return 0 for null or non-object filter", () => {
    assert.equal(calculateNestingLevel(null), 0);
    assert.equal(calculateNestingLevel("invalid"), 0);
  });

  test("should return 0 for simple filter", () => {
    const filter = { property: "Status", select: { equals: "Active" } };
    assert.equal(calculateNestingLevel(filter), 0);
  });

  test("should return 1 for single-level nested filter", () => {
    const filter = {
      and: [{ property: "Status", select: { equals: "Active" } }],
    };
    assert.equal(calculateNestingLevel(filter), 1);
  });

  test("should return 2 for two-level nested filter", () => {
    const filter = {
      and: [
        { and: [{ property: "Status", select: { equals: "Active" } }] },
        { property: "Priority", select: { equals: "High" } },
      ],
    };
    assert.equal(calculateNestingLevel(filter), 2);
  });
});

test.describe("validateFilter", () => {
  test("should pass for valid filter", () => {
    const filter = { property: "Status", select: { equals: "Active" } };
    assert.doesNotThrow(() => validateFilter(filter));
  });

  test("should throw for missing property", () => {
    const filter = { select: { equals: "Active" } };
    assert.throws(
      () => validateFilter(filter),
      { message: "Property is required in filter condition" }
    );
  });

  test("should throw for unsupported property type", () => {
    const filter = { property: "InvalidProp", select: { equals: "Active" } };
    assert.throws(
      () => validateFilter(filter),
      { message: /Unsupported property type for InvalidProp/ }
    );
  });

  test("should throw for unsupported operator", () => {
    const filter = { property: "Status", select: { invalid_op: "Active" } };
    assert.throws(
      () => validateFilter(filter),
      { message: /Unsupported operator 'invalid_op' for type 'status'/ }
    );
  });

  test("should validate nested filters", () => {
    const filter = {
      and: [
        { property: "Status", select: { equals: "Active" } },
        { property: "Priority", select: { equals: "High" } },
      ],
    };
    assert.doesNotThrow(() => validateFilter(filter));
  });
});

test.describe("fetchWithFlattenedFilter", () => {
  test.only("should fetch with simple filter", async () => {
    const filter = { property: "Status", select: { equals: "Active" } };
    const results = await fetchWithFlattenedFilter(filter, null, 2);
    assert.equal(results.length, 2);
    assert.equal(results[0].id, '1');
    assert.equal(results[1].id, '2');
  });

  test("should fetch with sort", async () => {
    const sort = { property: "Estimated Value", direction: "descending" };
    const results = await fetchWithFlattenedFilter(null, sort, 2);
    assert.equal(results.length, 2);
  });

  test("should handle nested filter with 'and'", async () => {
    const filter = {
      and: [
        { property: "Status", select: { equals: "Active" } },
        { property: "Priority", select: { equals: "High" } },
      ],
    };
    const results = await fetchWithFlattenedFilter(filter, null, 2);
    assert.equal(results.length, 2); // Mock returns same results
  });

  test("should throw for invalid sort property", async () => {
    const sort = { property: "InvalidProp", direction: "ascending" };
    await assert.rejects(
      fetchWithFlattenedFilter(null, sort, 2),
      { message: /Invalid sort property: InvalidProp/ }
    );
  });
});


require.cache[require.resolve("@notionhq/client")] = { exports: originalModule };