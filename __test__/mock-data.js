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

export const mockNotion = {
    databases: {
      query: async (params) => {
        return { results: mockQueryResults };
      },
    },
};