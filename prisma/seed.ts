import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 6 Pre-configured Captains
  const captains = [
    { name: 'Captain 1', role: 'Captain' },
    { name: 'Captain 2', role: 'Captain' },
    { name: 'Captain 3', role: 'Captain' },
    { name: 'Captain 4', role: 'Captain' },
    { name: 'Captain 5', role: 'Captain' },
    { name: 'Captain 6', role: 'Captain' },
  ]

  for (const c of captains) {
    await prisma.captain.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    })
  }

  // 6 Pre-configured Teams
  const teams = [
    { name: 'Team Alpha' },
    { name: 'Team Beta' },
    { name: 'Team Gamma' },
    { name: 'Team Delta' },
    { name: 'Team Epsilon' },
    { name: 'Team Zeta' },
  ]

  for (const t of teams) {
    await prisma.team.upsert({
      where: { name: t.name },
      update: {},
      create: t,
    })
  }

  // Players from public/assets/players.md
  interface PlayerData {
    name: string;
    rating: number;
    pool: string;
    minBid: number;
  }

  const players: PlayerData[] = [
    // Pool A - Platinum
    { name: 'Ashan', rating: 10, pool: 'A', minBid: 250000 },
    { name: 'Asik', rating: 10, pool: 'A', minBid: 250000 },
    // Pool B - Gold
    { name: 'Vithursan', rating: 8, pool: 'B', minBid: 180000 },
    { name: 'Buddika', rating: 8, pool: 'B', minBid: 180000 },
    { name: 'Achila', rating: 8, pool: 'B', minBid: 180000 },
    // Pool C - Silver
    { name: 'Gimhana', rating: 7, pool: 'C', minBid: 140000 },
    // Pool D - Bronze
    { name: 'Ravindu', rating: 5, pool: 'D', minBid: 90000 },
    { name: 'Inuri', rating: 5, pool: 'D', minBid: 90000 },
    { name: 'Anjani', rating: 5, pool: 'D', minBid: 90000 },
    { name: 'Shan', rating: 5, pool: 'D', minBid: 90000 },
    { name: 'Pasindu', rating: 5, pool: 'D', minBid: 90000 },
    { name: 'Isiwara', rating: 5, pool: 'D', minBid: 90000 },
    { name: 'Lasitha', rating: 5, pool: 'D', minBid: 90000 },
    { name: 'Sahiru', rating: 5, pool: 'D', minBid: 90000 },
    { name: 'Dinidu', rating: 5, pool: 'D', minBid: 90000 },
    { name: 'Dinuka', rating: 5, pool: 'D', minBid: 90000 },
    // Pool E - Emerging
    { name: 'Sewwandi', rating: 4, pool: 'E', minBid: 60000 },
    { name: 'Poorni', rating: 4, pool: 'E', minBid: 60000 },
    { name: 'Hansalie', rating: 4, pool: 'E', minBid: 60000 },
    { name: 'Sachith', rating: 4, pool: 'E', minBid: 60000 },
    // Pool F - Rookie
    { name: 'Thusiru', rating: 3, pool: 'F', minBid: 40000 },
    { name: 'Pramuditha', rating: 3, pool: 'F', minBid: 40000 },
    { name: 'Nimnadi', rating: 3, pool: 'F', minBid: 40000 },
    { name: 'Shenali', rating: 3, pool: 'F', minBid: 40000 },
    { name: 'Sanduni', rating: 3, pool: 'F', minBid: 40000 },
    { name: 'Mayumi', rating: 3, pool: 'F', minBid: 40000 },
    { name: 'Sineth', rating: 3, pool: 'F', minBid: 40000 },
    { name: 'Nipun', rating: 3, pool: 'F', minBid: 40000 },
    { name: 'Dulmini', rating: 3, pool: 'F', minBid: 40000 },
    { name: 'Eranda', rating: 3, pool: 'F', minBid: 40000 },
  ]

  for (const p of players) {
    await prisma.player.create({
      data: p,
    })
  }

  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
