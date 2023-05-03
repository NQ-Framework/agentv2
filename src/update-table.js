function updateTable(result, client) {
  return client
    .from("agent_query")
    .update({
      result: { status, errorText, resultSet: result },
      executed_at: new Date(),
      executed_by: 1,
    })
    .match({ id: payload.id });
}

module.exports = updateTable;
