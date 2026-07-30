/**
 * Recursively resolves a tree of Server Components (including async ones
 * using `getTranslations` from next-intl/server) into a plain element tree
 * that `@testing-library/react`'s synchronous `render()` can handle.
 *
 * React's own renderer walks a tree depth-first, calling each function
 * component as it goes — but it has no concept of awaiting a function that
 * returns a Promise, which is exactly what an async Server Component does.
 * So this resolver calls Server Components itself, ahead of time, and hands
 * React only the fully-resolved result.
 *
 * Client Components (hooks: useState, useTranslations, etc.) can't be
 * called directly outside a real render pass — that throws "Invalid hook
 * call". We rely on that throw to tell them apart from plain Server
 * Components with no hooks: try calling the function directly, and if it
 * throws, leave the element alone for React's real renderer to handle.
 */

import * as React from 'react';

function isAsyncFunctionComponent(type: unknown): type is (props: unknown) => Promise<unknown> {
  return typeof type === 'function' && type.constructor.name === 'AsyncFunction';
}

export async function resolveServerTree(node: React.ReactNode): Promise<React.ReactNode> {
  if (Array.isArray(node)) {
    return Promise.all(node.map(resolveServerTree));
  }

  if (!React.isValidElement(node)) {
    return node;
  }

  const { type, props } = node as React.ReactElement<{ children?: React.ReactNode }>;

  if (isAsyncFunctionComponent(type)) {
    const rendered = await type(props);
    return resolveServerTree(rendered as React.ReactNode);
  }

  if (typeof type === 'function') {
    try {
      const rendered = (type as (p: unknown) => React.ReactNode)(props);
      return resolveServerTree(rendered);
    } catch {
      // Threw (most likely "Invalid hook call") — a Client Component that
      // needs React's real render pass. Fall through and leave it as-is.
    }
  }

  if (props && 'children' in props) {
    const resolvedChildren = await resolveServerTree(props.children);
    return React.cloneElement(node, undefined, resolvedChildren as React.ReactNode);
  }

  return node;
}
