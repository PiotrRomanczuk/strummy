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
 * throws, leave the element alone for React's real renderer to handle —
 * but still resolve any async content hiding in ITS props (not just
 * `children` — e.g. a client tab switcher that takes a rendered `overview`
 * prop), since React's renderer never gets a chance to expand those itself.
 */

import * as React from 'react';

function isAsyncFunctionComponent(type: unknown): type is (props: unknown) => Promise<unknown> {
  return typeof type === 'function' && type.constructor.name === 'AsyncFunction';
}

function isNodeShaped(value: unknown): boolean {
  return React.isValidElement(value) || Array.isArray(value);
}

export async function resolveServerTree(node: React.ReactNode): Promise<React.ReactNode> {
  if (Array.isArray(node)) {
    return Promise.all(node.map(resolveServerTree));
  }

  if (!React.isValidElement(node)) {
    return node;
  }

  const { type, props } = node as React.ReactElement<Record<string, unknown>>;

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
      // needs React's real render pass. Fall through to resolve any
      // node-shaped props instead of assuming it's just `children`.
    }
  }

  if (!props || typeof props !== 'object') {
    return node;
  }

  const updatedProps: Record<string, unknown> = {};
  let changed = false;
  for (const [key, value] of Object.entries(props)) {
    if (isNodeShaped(value)) {
      const resolved = await resolveServerTree(value as React.ReactNode);
      if (resolved !== value) changed = true;
      updatedProps[key] = resolved;
    }
  }

  return changed ? React.cloneElement(node, updatedProps) : node;
}
