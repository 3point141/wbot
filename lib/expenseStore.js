export async function saveExpense(db, groupId, data) {
  await db.collection('expenses').insertOne({
    groupId,
    ...data,
    timestamp: new Date()
  });
}

export async function getAllExpenses(db, groupId) {
  return await db.collection('expenses').find({ groupId }).toArray();
}
