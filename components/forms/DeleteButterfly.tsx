"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

import { deleteButterfly } from "@/lib/actions/butterfly.actions";

interface Props {
  butterflyId: string;
  currentUserId: string;
  authorId: string;
  parentId: string | null;
  isComment?: boolean;
}

function DeleteButterfly({
  butterflyId,
  currentUserId,
  authorId,
  parentId,
  isComment,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();

  if (currentUserId !== authorId || pathname === "/") return null;

  return (
    <Image
      src='/assets/delete.svg'
      alt='delete'
      width={18}
      height={18}
      className='cursor-pointer object-contain'
      onClick={async () => {
        await deleteButterfly(JSON.parse(butterflyId), pathname);
        if (!parentId || !isComment) {
          router.push("/");
        }
      }}
    />
  );
}

export default DeleteButterfly;
