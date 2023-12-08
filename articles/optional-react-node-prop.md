---
title: "ReactNode型のpropを正しく扱う 〜もう謎の「0」や空要素を見せないために〜"
emoji: "0️⃣"
type: "tech"
publication_name: "yumemi_inc"
topics: [React, TypeScript]
published: true
---

この記事は [**株式会社ゆめみ Advent Calendar 2023**](https://qiita.com/advent-calendar/2023/yumemi) 2日目の記事です。

## 背景

普段Reactで開発していると、非表示にできる`ReactNode`型のprop（以下オプショナルな`ReactNode`prop）を定義することがあります。



### 例1: `Button` コンポーネント


`Button`はボタンのコンポーネントで、`icon` propを渡したときにスペースを開けてアイコンを表示し、渡さなければ表示しません。

```tsx:iconがあるときー！🤣
<Button icon={<PlusIcon />}>追加する</Button>
  // ↓
  // <button>
  //   <span style={{marginRight: "0.5rem"}}>
  //     <svg role="img" aria-label="" >...</svg>
  //   </span>
  //   追加する
  // </button>
```

```tsx:iconがないとき😭
<Button>追加する</Button>
  // ↓
  // <button>
  //   追加する
  // </button>
```

### 例2: `Checkbox` コンポーネント


`Checkbox`はチェックボックスのコンポーネントで、JSXの子要素(`children` prop)を渡したには全体を `label` でラップし、渡さなかったらラップしません。

```tsx:子要素があるときー！🤩
<Checkbox name="agreement">同意する</Checkbox>
  // ↓
  // <label>
  //   <input type="checkbox" name="agreement"/>
  //   同意する
  // </label>
```

```tsx:子要素がないとき🥹
<Checkbox name="agreement" htmlFor={id}/>
  // ↓
  // <input type="checkbox" name="agreement" htmlFor={id}/>
```

### 例3: `Layout` コンポーネント

`Layout`はページにおけるメインコンテンツの外側のコンポーネントで、ヘッダーとフッターの種類や有無を`ReactNode`型の`header`、`footer`でそれぞれ指定します。（コンポーネントのコンポジション）

```tsx:header、footerがあるときー！🥳
<Layout
  header={<HeaderContent />}
  footer={<FooterContent />}
>
  <MainContent />
</Layout>
  // ↓
  // <div>
  //   <header><HeaderContent /></header>
  //     <main>
  //       <MainContent />
  //     </main>
  //   <footer><FooterContent /></footer>
  // </div>
```

```tsx:header、footerがないとき☠
<Layout>
  <MainContent />
</Layout>
  // ↓
  // <div>
  //     <main>
  //       <MainContent />
  //     </main>
  // </div>
```




## 課題

オプショナル`ReactNode`propを定義するとき、単純に `&&` といった条件演算子や、 `boolean` へ型変換して「表示されない`ReactNode`型の値」を判定すると思わぬバグを引き起こすことがあります。

例えば、`Button`コンポーネントとオプショナルな`ReactNode`prop`icon`を考えます。`icon`を表示する場合は`span`要素で囲み、表示しない場合は囲みません。

先程述べた、表示されない`ReactNode`型の値の判別はこのようになります。

```tsx
// 条件演算子で判別する例
icon && <span>{icon}</span>

// booleanへ型変換して判別
!!icon && <span>{icon}</span>
// または
Boolean(icon) && <span>{icon}</span>
```

記事 [Reactの"要素の型"、それぞれの特性理解していますか？](https://zenn.dev/msy/articles/e21e729eb0727d) にあるように、`ReactNode`型は様々な`null`、`undefined`、`boolean`型など、様々な型をサブタイプに持ちます。これによって`<Button icon={isHoge && <Icon />} />` のように柔軟に条件つきでpropを渡すことができます。

`icon`に色々な値を入れていきましょう。

```tsx
// <Button icon={<PlusIcon />} />
// ReactElementはtruthyなのでspanで囲む
<span><PlusIcon /></span>

// <Button icon={"test"} />
// "test"はtruthyなのでspanで囲む
<span>test</span>

// <Button icon={100} />
// 100はtruthyなのでspanで囲む
<span>100</span>

// <Button icon={false} />
// falseはfalsyなのでspanで囲まない
// 何も表示されない

// <Button icon={null} />
// nullはfalsyなのでspanで囲まない
// 何も表示されない

// <Button icon={undefined} />
// undefinedはfalsyなのでspanで囲まない
// 何も表示されない
```

ちゃんと`icon`が表示されるときは `span`要素で囲まれ、表示さないときは何も表示されていません。アイコンなのに`"test"`とか`100`とか入れてんじゃねー　というツッコミは置いておいてください。

もっと実験してみましょう。


```tsx
// <Button icon={""} />
// "test"はfalsyなのでspanで囲まない
""

// <Button icon={0} />
// 0はfalsyなのでspanで囲まない
0

// <Button icon={true} />
// trueはtruthyなのでspanで囲む
<span></span>
```

おや？　謎の `0` や空の `span` が出てきましたね。

ここではアイコンなので`string`や`number`といった型の値が入ることは考えにくいですが、他のオプショナルな `ReactNode` propを持つコンポーネントでは考えられます。

試してみたように、値がtruthy/falsyであることと、表示される/されないことは必ずしも一致しません。これこそが謎の `0`や空要素の原因だったのです。

ちなみに、[typescript-eslintのstrict-boolean-expressionsルール](https://typescript-eslint.io/rules/strict-boolean-expressions)では、`ReactNode`型の変数を`boolean`型に変換して判定するような書き方を禁止できます。

## 解決方法

ReactNodeのうち、表示されないものは`true`、`false`、`null`、`undefined`の4つです。
（[React ドキュメント`isValidElement` 内 「DEEP DIVE」「React elements vs React nodes」](https://react.dev/reference/react/isValidElement#react-elements-vs-react-nodes:~:text=true%2C%20false%2C%20null%2C%20or%20undefined%20(which%20are%20not%20displayed))を参照のこと）

これらを適切に判別し、表示するべきかどうかを決定する必要があります。

先程の`icon`propの例だと、次のようになります。

```tsx
icon !== undefined &&
  icon !== null &&
  typeof icon !== "boolean" &&
  <span>{icon}</span>
```

……大変ですね！　ユーティリティ関数にしちゃいましょう。


```tsx:isRenderableReactNode.tsx
import { type ReactNode } from "react";

/**
 * 表示されるReactNode
 *
 * `ReactNode` から `true`, `false`, `null`, `undefined` を抜いたもの
 */
type RenderableReactNode = Exclude<ReactNode, null | undefined | boolean>;

/**
 * 表示されない React node (`true`, `false`, `null`, `undefined`) の時に `false` を、それ以外は `true` を返す
 *
 * @see https://react.dev/reference/react/isValidElement#react-elements-vs-react-nodes:~:text=true%2C%20false%2C%20null%2C%20or%20undefined%20(which%20are%20not%20displayed)
 */
export const isRenderableReactNode = (
  node: ReactNode,
): node is RenderableReactNode =>
  node !== undefined && node !== null && typeof node !== "boolean";
```

この関数を使うと、以下のように書けます。

```tsx
isRenderableReactNode(icon) && icon
```

すっきりしました！

これらの方法を用いることで、`ReactNode` 型のオプショナルなpropを適切に扱い、予期しないレンダリングを防ぐことができます。

やったね
