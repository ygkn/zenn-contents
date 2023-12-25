---
title: eslint-plugin-import-accessで「そこからそれはimportしないでください！！」を防ぐ
emoji: "📁"
type: "tech"
publication_name: "yumemi_inc"
topics: [TypeScript, ESLint]
published: true
---


[![YUMEMI New Grad Advent Calendar 2023](https://storage.googleapis.com/zenn-user-upload/aa11e374f2f8-20231205.png)](https://qiita.com/advent-calendar/2023/yumemi-23-graduation)

この記事は [**株式会社ゆめみの23卒 Advent Calendar 2023**](https://qiita.com/advent-calendar/2023/yumemi-23-graduation) 16日目の記事です。

## 3行で

- eslint-plugin-import-accessで「ディレクトリの他の階層からimportしてほしくないメンバ」を定義できるよ！
- さらに `defaultImportability: "package"`を指定するとちょっと初見殺し感があるけどかなり強力になるよ！
- re-exportを使う場合はビルドパフォーマンスやバンドルサイズに影響する可能性があるから気をつけよう！

## eslint-plugin-import-accessとは

アプリケーションなどを開発しているとき、あるモジュールの範囲内でのみ使用してほしい（=あるモジュールの中に隠蔽したい）変数や関数を定義したくなることがあります。

Webアプリケーションの文脈では、例えば次のようなものがあります。

- Recoilやjotaiのatomなど
- featureの中でのみ共通化したいロジック、定数
- いくつかのコンポーネントが中で使用しているが、直接使用されてほしくないコンポーネント

TypeScriptを用いた開発の場合、一定のモジュールの中に隠蔽する方法としては、次のようなものがあります。

- クラスのプライベートメンバにする（範囲はクラス）
- 変数をファイルからexportしない（範囲はファイル）
- パッケージを分ける（範囲はパッケージ）

しかし、先述の例ではクラスを使うとややこしくなり、1ファイルに隠蔽したい変数とその依存先を全部書くには量が多く複雑すぎ、パッケージを分けるほどの単位でもないことがあります。

そのような場合に1つのディレクトリの階層を「パッケージ」とし、アクセス範囲を限定できるのがeslint-plugin-import-accessです。

このESLint pluginが提供する`"import-access/jsdoc"`ルールを使用すると、JSDocの`@package`アノテーションが使用できるようになります。`@package`アノテーションが指定された変数は同じディレクトリの階層でのみ使用できるようになります。

例えば、[README](https://github.com/uhyo/eslint-plugin-import-access#readme)より引用した次のイラストでは、`@package`の挙動を表しています。`sub/foo.ts`で定義された`@package`アノテーションが付与された変数`foo`は、同じ階層の`sub/bar.ts`からは参照でき、上の階層の`main.ts`から参照するとエラーとなっています。

![@packageの挙動を表すイラスト](https://storage.googleapis.com/zenn-user-upload/c56ef096a9db-20231225.png)

eslint-plugin-import-accessの詳細は、作者の [@uhyo](https://zenn.dev/uhyo) さんが書かれた記事をご覧ください。

https://zenn.dev/uhyo/articles/eslint-plugin-import-access

## `defaultImportability: "package"` とは

5月、eslint-plugin-import-accessに`defaultImportability: "package"`というオプションが追加されました。

https://twitter.com/uhyo_/status/1661918459851329537

`"import-access/jsdoc"`ルールのデフォルトではなにもアノテーションが付与されていない変数は制限なしで、`@package`をつけたときのみimportを制限できました。このオプションを有効にすると、**アノテーションが付与されていない変数に制限がかかり、制限を無くすためには`@public`を付ける必要があります**。

これによって `@package` の付け忘れが原因の誤importを防ぐことができます。`@public`の付け忘れは、importを書いたときのエラーで検知できますね。

これは`"import-access/jsdoc"`ルールの挙動を変更する機能であるため、有効にすると大規模な変更が必要になる可能性があります。

## eslint-plugin-import-accessを利用したディレクトリ設計

ここでは`"import-access/jsdoc"`ルールと`defaultImportability: "package"`を使用したNext.jsプロジェクトの設計の例を提案します。この設計はわりと大きなプロジェクトでワークしています。特にパスの階層に関連するファイルをコロケーションするApp Routerで便利です（もちろんPages Routerでも便利に使えます）。

### `features`

`features`ディレクトリは、プロジェクトルートや`src`直下のみにあり、各機能ごとのコンポーネントや、ドメイン知識に依存した関数やコンポーネントなどを入れるディレクトリです。Webフロントエンド界隈ではかなり広まったような気がします。元ネタは多分[alan2207/bulletproof-react](https://github.com/alan2207/bulletproof-react)です。

それぞれのfeatureディレクトリでは、直下の`index.ts`内で`@public`アノテーションを付与しつつre-exportしています。`index.ts`を各ディレクトリの窓口にしている感じですね。

```ts:features/foo/Foo.ts
export const Foo = 1;
```

```ts:features/foo/index.ts
/** @public */
export { Foo } from "./foo";
```

### `components`

`components`ディレクトリは、Reactコンポーネントを入れるディレクトリです。プロジェクトルートや`src`直下のほか、各featureディレクトリ直下や、App Routerにおいては各パス階層に置きます。

`Foo`、`Bar`という複数のコンポーネントで、共通化したいが直接使われてほしくないUIを `Baz` というコンポーネントに切り出すことを考えます。

```tsx:components/foobar/Baz/Baz.tsx
export const Baz: FC = () => <></>
```

```tsx:components/foobar/Foo/Foo.tsx
export const Foo: FC = () => <Baz />
```

```tsx:components/foobar/Bar/Bar.tsx
export const Bar: FC = () => <Baz />
```

この場合、`Foo`と`Bar`の`index.ts`のみに`@public`を付与し、`Baz`に付けないことで`Baz`の直接の使用を防げます。

```tsx:components/foobar/Baz/index.tsx
export { Baz } from "./Baz";
```

```tsx:components/foobar/Foo/index.tsx
/** @public */
export { Foo } from "./Foo";
```

```tsx:components/foobar/Bar/index.tsx
/** @public */
export { Bar } from "./Bar";
```


### それ以外の`utils`など

それ以外では、適宜変数や関数に直接 `@public`を付与します。

`@public`アノテーションは、エディタ上でのJSDoc表示時に説明の邪魔にならないよう、JSDocの最後に書くのがおすすめです。

例えば、[表示できるReact Nodeかどうかを判定するisRenderableReactNode関数](https://zenn.dev/ygkn/articles/optional-react-node-prop)は次のようになります。

```ts:src/utils/react/isRenderableReactNode.ts
import { type ReactNode } from 'react';

import * as R from 'remeda';

type RenderableReactNode = Exclude<ReactNode, null | undefined | boolean>;

/**
 * 表示されない React node (`true`, `false`, `null`, `undefined`) の時に `false` を、それ以外は `true` を返す
 *
 * @see https://zenn.dev/ygkn/articles/optional-react-node-prop
 * @see https://react.dev/reference/react/isValidElement#react-elements-vs-react-nodes:~:text=true%2C%20false%2C%20null%2C%20or%20undefined%20(which%20are%20not%20displayed)
 *
 * @public
 */
export const isRenderableReactNode = (node: ReactNode): node is RenderableReactNode =>
  R.isDefined(node) && !R.isBoolean(node);
```

## 再export時の注意

`import-access/jsdoc` ルールでは、`index.ts`ファイルを使用することで、1つ親の階層でも`@package`が付与された（または `defaultImportability: "package"` にて`@public`が付いていない）変数を使用できます。（この挙動は`indexLoophole`オプションが`false`の場合、無効にできます）そのため、`index.ts`にて再exportする上記の設計方法にメリットがあります。

しかし、このような再exportは積み重なるとビルド時間やバンドルサイズなど、パフォーマンスに影響が出るという結果があります。

https://marvinh.dev/blog/speeding-up-javascript-ecosystem-part-7/

https://vercel.com/blog/how-we-optimized-package-imports-in-next-js

先述の設計はこのことを知る前に作られたものであるため考慮していませんが、パフォーマンスに無視できない影響が出たら設計を見直す可能性があります。

例えば、次のような変更が考えられます。

- featuresでは、`index.ts`を通さず直接変数や関数に`@public`をつける
- componentsでは、コンポーネントごとにフォルダを作成せず、VS CodeのExplorer file nestingなど、エディタの設定を利用してまとめて表示させる

## まとめ

この記事では、`"import-access/jsdoc"`ルールと`defaultImportability: "package"`を使用したNext.jsプロジェクトの設計の例を提案しました。

この設計で、importの制御をかなりやりやすくなりました。eslint-plugin-import-accessを開発されたuhyoさんには感謝でいっぱいです。

eslint-plugin-import-accessを使用した設計は情報がまだ少なく、この設計も手探りでできたものです。もし別の方法があれば、情報をお待ちしております。
