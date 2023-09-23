"use server";

import { revalidatePath } from "next/cache";

import { connectToDB } from "../mongoose";

import User from "../models/user.model";
import Butterfly from "../models/butterfly.model";
import Community from "../models/community.model";

export async function fetchPosts(pageNumber = 1, pageSize = 20) {
  connectToDB();

  // Calculate the number of posts to skip based on the page number and page size.
  const skipAmount = (pageNumber - 1) * pageSize;

  // Create a query to fetch the posts that have no parent (top-level butterfly) (a butterfly that is not a comment/reply).
  const postsQuery = Butterfly.find({ parentId: { $in: [null, undefined] } })
    .sort({ createdAt: "desc" })
    .skip(skipAmount)
    .limit(pageSize)
    .populate({
      path: "author",
      model: User,
    })
    .populate({
      path: "community",
      model: Community,
    })
    .populate({
      path: "children", // Populate the children field
      populate: {
        path: "author", // Populate the author field within children
        model: User,
        select: "_id name parentId image", // Select only _id and username fields of the author
      },
    });

  // Count the total number of top-level posts (butterfly) i.e., butterfly that are not comments.
  const totalPostsCount = await Butterfly.countDocuments({
    parentId: { $in: [null, undefined] },
  }); // Get the total count of posts

  const posts = await postsQuery.exec();

  const isNext = totalPostsCount > skipAmount + posts.length;

  return { posts, isNext };
}

interface Params {
  text: string,
  author: string,
  communityId: string | null,
  path: string,
}

export async function createButterfly({ text, author, communityId, path }: Params
) {
  try {
    connectToDB();

    const communityIdObject = await Community.findOne(
      { id: communityId },
      { _id: 1 }
    );

    const createdButterfly = await Butterfly.create({
      text,
      author,
      community: communityIdObject, // Assign communityId if provided, or leave it null for personal account
    });

    // Update User model
    await User.findByIdAndUpdate(author, {
      $push: { butterfly: createdButterfly._id },
    });

    if (communityIdObject) {
      // Update Community model
      await Community.findByIdAndUpdate(communityIdObject, {
        $push: { butterfly: createdButterfly._id },
      });
    }

    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Failed to create butterfly: ${error.message}`);
  }
}

async function fetchAllChildbutterfly(butterflyId: string): Promise<any[]> {
  const childbutterfly = await Butterfly.find({ parentId: butterflyId });

  const descendantbutterfly = [];
  for (const childButterfly of childbutterfly) {
    const descendants = await fetchAllChildbutterfly(childButterfly._id);
    descendantbutterfly.push(childButterfly, ...descendants);
  }

  return descendantbutterfly;
}

export async function deleteButterfly(id: string, path: string): Promise<void> {
  try {
    connectToDB();

    // Find the butterfly to be deleted (the main butterfly)
    const mainButterfly = await Butterfly.findById(id).populate("author community");

    if (!mainButterfly) {
      throw new Error("Butterfly not found");
    }

    // Fetch all child butterfly and their descendants recursively
    const descendantbutterfly = await fetchAllChildbutterfly(id);

    // Get all descendant butterfly IDs including the main butterfly ID and child butterfly IDs
    const descendantButterflyIds = [
      id,
      ...descendantbutterfly.map((butterfly) => butterfly._id),
    ];

    // Extract the authorIds and communityIds to update User and Community models respectively
    const uniqueAuthorIds = new Set(
      [
        ...descendantbutterfly.map((butterfly) => butterfly.author?._id?.toString()), // Use optional chaining to handle possible undefined values
        mainButterfly.author?._id?.toString(),
      ].filter((id) => id !== undefined)
    );

    const uniqueCommunityIds = new Set(
      [
        ...descendantbutterfly.map((butterfly) => butterfly.community?._id?.toString()), // Use optional chaining to handle possible undefined values
        mainButterfly.community?._id?.toString(),
      ].filter((id) => id !== undefined)
    );

    // Recursively delete child butterfly and their descendants
    await Butterfly.deleteMany({ _id: { $in: descendantButterflyIds } });

    // Update User model
    await User.updateMany(
      { _id: { $in: Array.from(uniqueAuthorIds) } },
      { $pull: { butterfly: { $in: descendantButterflyIds } } }
    );

    // Update Community model
    await Community.updateMany(
      { _id: { $in: Array.from(uniqueCommunityIds) } },
      { $pull: { butterfly: { $in: descendantButterflyIds } } }
    );

    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Failed to delete butterfly: ${error.message}`);
  }
}

export async function fetchButterflyById(butterflyId: string) {
  connectToDB();

  try {
    const butterfly = await Butterfly.findById(butterflyId)
      .populate({
        path: "author",
        model: User,
        select: "_id id name image",
      }) // Populate the author field with _id and username
      .populate({
        path: "community",
        model: Community,
        select: "_id id name image",
      }) // Populate the community field with _id and name
      .populate({
        path: "children", // Populate the children field
        populate: [
          {
            path: "author", // Populate the author field within children
            model: User,
            select: "_id id name parentId image", // Select only _id and username fields of the author
          },
          {
            path: "children", // Populate the children field within children
            model: Butterfly, // The model of the nested children (assuming it's the same "Butterfly" model)
            populate: {
              path: "author", // Populate the author field within nested children
              model: User,
              select: "_id id name parentId image", // Select only _id and username fields of the author
            },
          },
        ],
      })
      .exec();

    return butterfly;
  } catch (err) {
    console.error("Error while fetching butterfly:", err);
    throw new Error("Unable to fetch butterfly");
  }
}

export async function addCommentToButterfly(
  butterflyId: string,
  commentText: string,
  userId: string,
  path: string
) {
  connectToDB();

  try {
    // Find the original butterfly by its ID
    const originalButterfly = await Butterfly.findById(butterflyId);

    if (!originalButterfly) {
      throw new Error("Butterfly not found");
    }

    // Create the new comment butterfly
    const commentButterfly = new Butterfly({
      text: commentText,
      author: userId,
      parentId: butterflyId, // Set the parentId to the original butterfly's ID
    });

    // Save the comment butterfly to the database
    const savedCommentButterfly = await commentButterfly.save();

    // Add the comment butterfly's ID to the original butterfly's children array
    originalButterfly.children.push(savedCommentButterfly._id);

    // Save the updated original butterfly to the database
    await originalButterfly.save();

    revalidatePath(path);
  } catch (err) {
    console.error("Error while adding comment:", err);
    throw new Error("Unable to add comment");
  }
}
