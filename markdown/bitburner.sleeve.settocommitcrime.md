<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [bitburner](./bitburner.md) &gt; [Sleeve](./bitburner.sleeve.md) &gt; [setToCommitCrime](./bitburner.sleeve.settocommitcrime.md)

## Sleeve.setToCommitCrime() method

Set a sleeve to commit crime.

<b>Signature:</b>

```typescript
setToCommitCrime(sleeveNumber: number, name: string): boolean;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  sleeveNumber | number | Index of the sleeve to start commiting crime. |
|  name | string | Name of the crime. Must be an exact match. |

<b>Returns:</b>

boolean

True if this action was set successfully, false otherwise.

## Remarks

RAM cost: 4 GB

Return a boolean indicating whether or not this action was set successfully.

Returns false if an invalid action is specified.
