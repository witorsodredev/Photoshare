import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NewAlbumButton from "@/components/NewAlbumButton";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const albums = await prisma.album.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { photos: true } },
      photos: {
        take: 1,
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: { id: true },
      },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Seus álbuns</h1>
          <p className="mt-1 text-sm text-gray-400">
            {albums.length} álbum(ns) no seu workspace.
          </p>
        </div>
        <NewAlbumButton />
      </div>

      {albums.length === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <p className="text-gray-300">Nenhum álbum ainda.</p>
          <p className="mt-1 text-sm text-gray-500">
            Crie um álbum e faça upload das fotos em resolução original.
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((album) => (
            <li key={album.id}>
              <Link
                href={`/workspace/albums/${album.id}`}
                className="card group block overflow-hidden transition hover:border-blue-500/50"
              >
                <div className="aspect-[4/3] bg-ink">
                  {album.coverPhotoId || album.photos[0] ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={`/api/image/${album.coverPhotoId ?? album.photos[0].id}?v=thumb`}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-gray-600">
                      Sem fotos
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{album.title}</p>
                    {album.isPublic && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                        público
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {album._count.photos} foto(s)
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
