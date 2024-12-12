---
title: "Next.jsの型を厳密に定義しなおしてロジックのミスを発見する"
emoji: "🧷"
type: "tech"
topics:
  - "nextjs"
  - "typescript"
  - "eslint"
published: true
publication_name: "yumemi_inc"
---

これは、[株式会社ゆめみ Advent Calendar 2024](https://qiita.com/advent-calendar/2024/yumemi) 13日目の記事です。

Next.js (Pages Router) のAPI route handlerにおいて、ValibotやZodで値の検証をせずにリクエストボディの値を使用することを、型検査レベルで防ぐことを考えます。

例えば、次のようなコードで、処理の順番やロジックの誤りを型エラーを出して気づきたいといったものです。

```ts
import { NextApiHandler } from "next";
import * as v from "valibot";

const RequestBodySchema = v.object({
  someValue: v.string(),
});

const handler: NextApiHandler = async (req, res) => {
  // バリデーション前に参照！　型エラーが出てほしい
  console.log(req.body.someValue);

  // if文の条件が逆になっている
  if (v.is(RequestBodySchema, req.body)) {
    res.status(400).send({ message: "bad request" });
    return; // ここの早期 return も忘れるかも……
  }

  // 逆になったif文のせいで、バリデーション前に参照してしまっている！　型エラーが出てほしい
  // 前の早期 return が忘れてしまっていた場合も、バリデーション前に参照してしまうことに…
  console.log(req.body.someValue);
};

export default handler;

```

[このコードの TypeScript Playgrond](https://www.typescriptlang.org/play/?#code/LAKAlgtgDg9gTgFwAQG8kIJ5QKZIHLYAeCAglGABICGAdgCYA22cSAvkgGZwwRIBENIgj4BuUJFiIkAKiRUAzkgBunbrz5KqDMACMYwsSFCgAxjBrzkAJWwBHAK7ZLAIRh0MAZRMALbBCpIALzKAHQwOgBW2CYIABQooEhI8jzYAGpajgBcoZZwYDQA5rEAlAA0oKwlhqbmlkjetIzMOQTEZJRNTCzBChg0JkixcHZlSCPyJUEAfKiJSAD0C0iACwyAVwyA4wyAPwyA7QyA5wyAzwyAskqA1gyAQ8qA5o7zZhYwTCEMMMUjtiF67iEpEOmZ2NXGICSSyQYA4gHDTQB2DIBDc0Ab3KAGQZAGAJJ0AVgyAYwZAGYMgBEGQDRDPNQUMlCEwPJYjYHE4EK53F5fP4xi83m4MCUpglAUlxk5PggqAh7CSACwABiFJU+2Ho8SQ33k8iohWwOT4OiodE55MsfDY-3ZSRGfLgNBEi2WgGUGU0QwCXpoB8c05BpoSEAQQyADf1ADEM2MA0gyOwBkBN75qwAUDlki0YB9BlBkMA2gyYwDmDIBABnW232x3OF0A6gzotOAPwYMTj5sCjlbbfr7IakHC3Zmc1jQ4AWDUAECqOhObXaHU6XDPZwBiDKbABYMJz97JuKXuj2edkZHy+PwYjh1rBqICIkmQdGwHCo9gYyEa9G6IiAA)


そのままでは、 Next.jsの型付けにより `req.body` (`NextApiRequest["body"]`) の型は `any` になるため、`req.body.someValue` などのように検証なしで参照しても型エラーは出ません。

そこで、`req.body` の型を `unknown` として上書きすることで、先述のような検証なしでの `req.body` の参照が型エラーとする方法を考えます。

## より厳密な型を定義する

Next.jsが提供する型 `NextApiRequest` を上書きした型 `StrictNextApiRequest` と、それを用いて `NextApiHandler` と同様に `StrictNextApiHandler` を作成します。


```ts:src/utils/next/StrictNextApiRequest.ts
import { type NextApiRequest } from 'next';

export type StrictNextApiRequest = Omit<NextApiRequest, 'body'> & {
  body: unknown;
};
```

```ts:src/utils/next/StrictNextApiHandler.ts
import { type NextApiResponse } from 'next';

import { type StrictNextApiRequest } from './StrictNextApiRequest';

export type StrictNextApiHandler = (req: StrictNextApiRequest, res: NextApiResponse) => void | Promise<void>;
```

そして、ハンドラーの定義に`StrictNextApiHandler`を用いるようにします。

```ts

import * as v from "valibot";

import { type StrictNextApiHandler } from "@/utils/next/StrictNextApiHandler"

const RequestBodySchema = v.object({
  someValue: v.string(),
});

const handler: StrictNextApiHandler = async (req, res) => {
  // バリデーション前に参照！　型エラーが発生
  console.log(req.body.someValue);

  // if文の条件が逆になっている
  if (v.is(RequestBodySchema, req.body)) {
    res.status(400).send({ message: "bad request" });
    return; // ここの早期 return も忘れるかも……
  }

  // 逆になったif文のせいで、バリデーション前に参照してしまっている！　型エラーが発生
  console.log(req.body.someValue);
};

export default handler;
```

[このコードの TypeScript Playgrond](https://www.typescriptlang.org/play/?#code/LAKA9GAEAGsC4GcBcCBOBjMBXOBLANgmAHYCmAHnGAMpyq7pwByFcAggA64BKpAjllII4AOkShcAWw4B7VHEgBvSHACeHUpBaVOPfoOGQAvpABmqGZMgByMpWsBuUKAqz5K9Ztr1G29l14BIQUAXkgAeUlcOAAeP11AgzgAGhsAIxkAE1VrAD5IADIlUEhIDOykSCxiAGtiGQB3YicQIxaIGFhncChYaEQUDGw8QhJWGjoGZlZdAAkAQ2JM-FJUMQQJaTkFZTUNLRmAoVliBE0Tc0sbOzhHbo6pNx2Pfe8p+KOgwwuLK2sRCY+aY6T5JO4gFzkJ4vLyTXyHXALJYrVCQMIAClQ-Eqb3hIL0XxSkCxyAO+N4CBOZwAlGj8gA3GS4TKQAA+kAACr9cGcYozmbl2r0uhDRR0+uIQI9tpAAFSQeYISD0sy-SAAInp83wuAycHVLVADy27l2nkguOB-kRi2Wq2Mqqu6oAAsMCEQboD3gikXbUOruugZKcFIlggAhLKqajoAAWpEk8zRypEMjSACtSIx0YoSpAEJZSAA1bWCSr0kTCejEADm6OpyVARmphpAQZDkFjtpROLhVrm3ftYUVqmI6EgmP4qRJtJC+VzIFKHUACwyAK4ZAOMMgB+GQDtDIBzhkAzwyAWSVANYMgCHlQDmjoBAf8AAAyAaPVABUMgEuGTeAGQZAF5ugHxXPPtgsrET4GQ6yxPgRHKVRK0LEt8EEFtuiXKBcFMQBw00AOwZAENzQA3uRfQAwBOPQArBkAYwZADMGQARBkAaIY80QicKx5dEw2ESNshjeNE2nfhQKjalaQXUpShJSs4HmOAsAQdEABYAAYJOpStSCWHNIEkIQEHmGtSEqdU0nmFlgKSdVjFgxdeKxYTUGaSAOkAZQZLJQwBL00AfHNiVIUziEgQAghkADf1ABiGMjAGkGNzADICAK8yMOCLKgXDCMAfQZENQwBtBhIwBzBkAQAY1y3PcjzPc9AHUGIjssAPwZiPIm8H2fd8vyMn8ZD-ACgPYsCIKUqCYJaNpulcGVMlIUx5iwfAFC7ZFViFIA)

これで、型エラーが起こるようになりました。


## ESLint を使って元の型の使用を防ぐ


これで `StrictNextApiHandler` を使用している限りは検証なしの参照を防ぐことができました。しかし、ミスやこの情報を知らない開発者によって、Next.jsからインポートした `NextApiHandler` を使用した場合は、依然としてこのチェックをすり抜けてしまいます。

そこで、`NextApiHandler` や `NextApiRequest` を使用した時に、自動で `StrictNextApiHandler` や `StrictNextApiRequest`を使うよう警告するようにする方法を考えます。

ここでは、ESLintの [no-restricted-syntaxルール](https://eslint.org/docs/latest/rules/no-restricted-syntax) を使用します。このルールでは、抽象構文木を表す [AST selectors](https://eslint.org/docs/latest/extend/selectors) を指定することにより、特定の構文の使用を禁止できます。

この場合は、`NextApiHandler`や`NextApiRequest`といった`name`を持った`Identifier`を禁止するため、次のように記述します。

```json:eslintrc
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "Identifier[name=NextApiHandler]",
        "message": "`NextApiHandler` is forbidden. Use `StrictNextApiHandler` instead."
      },
      {
        "selector": "Identifier[name=NextApiRequest]",
        "message": "`NextApiRequest` is forbidden. Use `StrictNextApiRequest` instead."
      }
    ]
  }
}
```

この状態でエディタ上やCLIでESLintを実行すると、`` `NextApiHandler` is forbidden. Use `StrictNextApiHandler` instead. ``などのエラーになります。

ちなみに、狙ったSelectorを決めるためには[typescript-eslintのPlayground](https://typescript-eslint.io/play/)が便利でした。コードを入力しながら「ESTree」タブであたりをつけて「ESQuery filter」に入力して狙った箇所が選択できているかを確認できます。

![typescript-eslintのPlaygroundのスクリーンショット。「code」タブに"next"パッケージから複数の方法法で NextApiHandler 型をimportするコードが書かれており、右側の「ESTree」タブでそのコードの抽象構文木が表示されている。コードの内容は、 import { NextApiHandler } from "next"; import { NextApiHandler as A } from "next"; import * as Next from "next" let a: Next.NextApiHandler; ](/images/nextjs-api-route-handler-request-body-type-safer/typescript-eslint-playground.png)
*「ESTree」タブでNodeのtypeとattributeを調べている。1つめのimport文の`NextApiHandler`型にフォーカスが当たっており、その箇所に対応する AST Node がハイライトされている。*

![typescript-eslintのPlaygroundのスクリーンショット。「code」タブに"next"パッケージから複数の方法法で NextApiHandler 型をimportするコードが書かれており、右側の「ESTree」タブ上部の検索窓に Identifier[name=NextApiHandler] と入力され、フィルタされたASTが表示されている。コードの内容は、import { NextApiHandler } from "next"; import { NextApiHandler as A } from "next"; import * as Next from "next" let a: Next.NextApiHandler;`](/images/nextjs-api-route-handler-request-body-type-safer/typescript-eslint-playground-filtered.png)
*Selectorを入力して、該当の要素が選択できているかを確認している。*

## 余談

リクエストボディから値を参照する際、直接 `req.body` を参照するのではなく、スキーマと元のデータをもとに新たに値を組み立て、必ずその値を使用するようにして、不正な値の使用を防ぐこともできます。この考え方を[Parse, don’t validate](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/)（[和訳記事](https://zenn.dev/mj2mkt/articles/2024-10-11-parse-dont-validate)）といい、ValibotやZodではこれに基づいた `parse` や `safeParse` といったAPIを提供しています。

しかし、パースによって得られた値を使わずに直接 `req.body` を参照してしまうとエラーは起こらないため、型を定義しなおす対応は別途必要になります。

```ts
import { type NextApiHandler } from "next";
import * as v from "valibot";


const RequestBodySchema = v.object({
  someValue: v.string(),
});

const handler: NextApiHandler = async (req, res) => {
  const reqestBodyParseResult = v.safeParse(RequestBodySchema, req.body);

  // if文の条件が逆になっている
  if (reqestBodyParseResult.success) {
    res.status(400).send({ message: "bad request" });
    return;
  }

  // reqestBodyParseResult.output.someValue はunknownなのでエラー！
  console.log(reqestBodyParseResult.output.someValue);

  // 直接 req.body を参照してしまうと、エラーにならない
  console.log(req.body.someValue);
};

export default handler;
```

コードの構造や安全性の面でもパースを使用することは有用なのですが、ここで扱う問題への完全な解決策ではないため、余談とします。

## まとめ

この記事では、Next.jsが提供する型をより厳密にしたものを新たに定義し、その型を使用することを強制する方法を紹介しました。今回の問題やフレームワークに限らず、この方法が有用な機会はあると考えています。今回紹介した内容があなたの開発の一助となれば幸いです。
