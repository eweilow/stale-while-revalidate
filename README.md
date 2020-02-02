# stale-while-revalidate

A very simple stale-while-revalidate module with built-in batching

## Usage

The simplest usage is the following:

```typescript
async function fetchData() {
  // fetch data
  const value = await fn(); // ..whatever

  return {
    value,
    maxAgeSeconds: 1 // Set to whatever you want
  };
}

const loader = singleStaleWhileRevalidate(fetchData);

async function loadData() {
  const { stale, value } = await loader();
  // Value is now fetched if it has not been fetched before
  // Otherwise the last fetched value is returned
  // While a new fetch is initiated if it is stale
}
```

There is a special usage of the `loader`-function, which uses the optional first argument:

```typescript
const loader = singleStaleWhileRevalidate(fetchData);

async function loadData() {
  const fresh = true;
  const { stale, value } = await loader(fresh);
  // We now never receive a stale response.
  // invariant: if fresh == true, then stale == false
}
```
