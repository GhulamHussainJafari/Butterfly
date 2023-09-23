import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs";

import Comment from "@/components/forms/Comment";
import ButterflyCard from "@/components/cards/ButterflyCard";

import { fetchUser } from "@/lib/actions/user.actions";
import { fetchButterflyById } from "@/lib/actions/butterfly.actions";

export const revalidate = 0;

async function page({ params }: { params: { id: string } }) {
  if (!params.id) return null;

  const user = await currentUser();
  if (!user) return null;

  const userInfo = await fetchUser(user.id);
  if (!userInfo?.onboarded) redirect("/onboarding");

  const butterfly = await fetchButterflyById(params.id);

  return (
    <section className='relative'>
      <div>
        <ButterflyCard
          id={butterfly._id}
          currentUserId={user.id}
          parentId={butterfly.parentId}
          content={butterfly.text}
          author={butterfly.author}
          community={butterfly.community}
          createdAt={butterfly.createdAt}
          comments={butterfly.children}
        />
      </div>

      <div className='mt-7'>
        <Comment
          butterflyId={params.id}
          currentUserImg={user.imageUrl}
          currentUserId={JSON.stringify(userInfo._id)}
        />
      </div>

      <div className='mt-10'>
        {butterfly.children.map((childItem: any) => (
          <ButterflyCard
            key={childItem._id}
            id={childItem._id}
            currentUserId={user.id}
            parentId={childItem.parentId}
            content={childItem.text}
            author={childItem.author}
            community={childItem.community}
            createdAt={childItem.createdAt}
            comments={childItem.children}
            isComment
          />
        ))}
      </div>
    </section>
  );
}

export default page;
