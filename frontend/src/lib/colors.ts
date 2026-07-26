const userColors = ['#6657f5', '#e56a9f', '#ef9f43', '#4dbb87', '#28b9c7']

export function colorForUser(userId: number) {
  return userColors[Math.abs(userId) % userColors.length]
}
