import { prisma } from '@/lib/prisma';

export async function GET() {
  const tiles = await prisma.listTile.findMany({ orderBy: { createdAt: 'desc' } });
  return Response.json(tiles);
}

export async function POST(req: Request) {
  const body = await req.json();
  const tile = await prisma.listTile.create({ data: body });
  return Response.json(tile, { status: 201 });
}
