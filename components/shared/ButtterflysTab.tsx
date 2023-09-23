import { redirect } from "next/navigation";

import { fetchCommunityPosts } from "@/lib/actions/community.actions";
import { fetchUserPosts } from "@/lib/actions/user.actions";

import ButterflyCard from "../cards/ButterflyCard";

interface Result {
  name: string;
  image: string;
  id: string;
  butterfly: {
    _id: string;
    text: string;
    parentId: string | null;
    author: {
      name: string;
      image: string;
      id: string;
    };
    community: {
      id: string;
      name: string;
      image: string;
    } | null;
    createdAt: string;
    children: {
      author: {
        image: string;
      };
    }[];
  }[];
}

interface Props {
  currentUserId: string;
  accountId: string;
  accountType: string;
}

async function butterflyTab({ currentUserId, accountId, accountType }: Props) {
  let result: Result;

  if (accountType === "Community") {
    result = await fetchCommunityPosts(accountId);
  } else {
    result = await fetchUserPosts(accountId);
  }

  if (!result) {
    redirect("/");
  }

  return (
    <section className='mt-9 flex flex-col gap-10'>
      {result.butterfly.map((butterfly) => (
        <ButterflyCard
          key={butterfly._id}
          id={butterfly._id}
          currentUserId={currentUserId}
          parentId={butterfly.parentId}
          content={butterfly.text}
          author={
            accountType === "User"
              ? { name: result.name, image: result.image, id: result.id }
              : {
                  name: butterfly.author.name,
                  image: butterfly.author.image,
                  id: butterfly.author.id,
                }
          }
          community={
            accountType === "Community"
              ? { name: result.name, id: result.id, image: result.image }
              : butterfly.community
          }
          createdAt={butterfly.createdAt}
          comments={butterfly.children}
        />
      ))}
    </section>
  );
}

export default butterflyTab;
