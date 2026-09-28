# Prompts do cenário novo (Magnific)

O cenário é montado em **6 imagens**: o pé da árvore, dois trechos do tronco, a copa, uma folha de nuvens e uma folha de galhos. Depois eu recorto, tiro o fundo, emendo e encaixo tudo no jogo.

## Como gerar

1. **Referência de estilo:** use a arte do menu, `assets/inicio2.png`, em todas as imagens. É ela que deixa o cenário pintado igual ao menu.
2. **Referência de composição:** nas peças 1 a 4, use também o guia da pasta `arte-cenario-ia/guias/`. O guia é o meu desenho da peça, com fundo magenta no lugar do céu. Ele serve para manter o tronco na posição e na largura certas. Se o Magnific tiver uma força para essa referência, deixe **média**: forte o suficiente para manter a largura e a posição do tronco, e fraca o suficiente para a IA pintar do jeito dela.
3. **Formato:** retrato **9:16**, na maior resolução disponível. Para a copa, depois de escolher, faça também um **upscale 2x**.
4. **Variações:** gere 2 a 4 variações de cada peça e escolha a melhor. Se ficar em dúvida, pode me mandar todas.
5. **Fundo:** o fundo precisa ser **magenta liso (#FF00FF)**, porque o céu é desenhado pelo jogo e muda com a altura. Se a IA insistir em colocar céu, use "remover fundo" no próprio Magnific, ou me mande assim mesmo que eu limpo.

**Regras que valem para todas as peças:**
- **Largura do tronco:** cerca de **1/3 da largura da imagem**, bem no **centro** e **reto na vertical**, sem inclinar.
- **Emendas:** nos trechos do tronco (peças 2 e 3), a madeira entra pela borda de cima e sai pela de baixo com a mesma largura, para as peças se emendarem.
- **Nada de personagens:** nem gato, nem guaxinim, nem textos, logos ou moldura. Os únicos bichos são os que o prompt pede (esquilo e coruja).

## Estilo e prompt negativo (para colar em todas)

**Estilo (cole no fim de cada prompt):**

```
Style: cute cozy 2D cartoon mobile game art, hand-painted look with soft painterly shading, bold dark-brown outlines, warm vibrant colors, orange-tan tree bark with wavy wood grain and spiral wood knots, lush green foliage with yellow-green highlights, blue-green pine trees, clean readable shapes, high detail, same art style as the reference image. Front view, no perspective tilt.
```

**Negativo (se o Magnific tiver o campo):**

```
text, letters, logo, watermark, signature, frame, border, UI, cat, raccoon, people, characters, photorealistic, 3D render, blurry, tilted trunk, leaning tree, perspective, sky, sun, gradient background, stars
```

## Peça 1: pé da árvore

- **Arquivo:** `base.png`, formato 9:16, com o guia `guias/guia-1-base.png`.

```
Vertical 2D mobile game background, the base of one gigantic tree seen straight from the front. The trunk is perfectly vertical and centered, about one third of the image width, and continues beyond the top edge of the image. At the bottom it flares into thick roots that sink into the ground. Between two roots on the left: a tiny round green fairy door with a glowing round window and a small hanging lantern. At the foot of the tree: a few spilled light-brown wood pellets, red mushrooms with white spots, small white and pink flowers, grey rocks and round green bushes. A green ivy vine climbs the lower left part of the trunk, and three shelf mushrooms grow on its right edge. Behind the tree: a layered pine forest, two big round leafy trees framing the left and right edges, distant snowy blue mountains, and a small waterfall falling between rocks into a little pond on the right side. The sky is a flat solid magenta color (#FF00FF) with no clouds, no sun and no gradient. Grassy ground along the bottom edge.
```

(+ estilo)

## Peça 2: tronco, trecho 1 (esquilo e ninho)

- **Arquivo:** `tronco-1.png`, formato 9:16, com o guia `guias/guia-2-tronco-1.png`.

```
Vertical 2D mobile game background tile: a straight section of one gigantic tree trunk, perfectly vertical and centered, about one third of the image width, running from the very top edge to the very bottom edge of the image with the same width everywhere, so several sections can be stacked seamlessly. Orange-tan bark with wavy vertical wood grain, one big spiral knot and small wood "eye" knots, lit from the left with a soft shadow on the right side, dark-brown outline on both edges. Details on this section, from bottom to top: a small pine branch on the right side; a pine branch with lush needle clusters coming out of the left side, holding a bird nest with three light-blue eggs; a heart carved into the bark with a little paw print inside; a pine branch coming out of the right side with a cute small squirrel sitting on it holding a pine cone; two small shelf mushrooms on the left edge near the top. Everything outside the trunk and the branches is a flat solid magenta background (#FF00FF): no sky, no clouds.
```

(+ estilo)

## Peça 3: tronco, trecho 2 (coruja)

- **Arquivo:** `tronco-2.png`, formato 9:16, com o guia `guias/guia-3-tronco-2.png`.

```
Vertical 2D mobile game background tile: a straight section of one gigantic tree trunk, perfectly vertical and centered, about one third of the image width, running from the very top edge to the very bottom edge of the image with the same width everywhere, so several sections can be stacked seamlessly. Orange-tan bark with wavy vertical wood grain, a spiral knot and small wood "eye" knots, lit from the left with a soft shadow on the right side, dark-brown outline on both edges. Details on this section, from bottom to top: a pine branch with lush needle clusters on the left side; three small round woodpecker holes; a pine branch on the right side; a round hollow in the trunk with a cute owl peeking out with big round eyes; another pine branch on the left near the top. Everything outside the trunk and the branches is a flat solid magenta background (#FF00FF): no sky, no clouds.
```

(+ estilo)

## Peça 4: copa do pinheiro

- **Arquivo:** `copa.png`, formato 9:16 e depois upscale 2x, com o guia `guias/guia-4-copa.png`.

```
Vertical 2D mobile game art: the top of one gigantic pine tree seen from the front, centered and filling the full height of the image. Dense tiers of pine branches with drooping, scalloped needle edges, each tier casting a soft shadow on the one below, getting narrower toward a pointed tip that touches the top edge of the image. Brown pine cones hang from the tiers. The upper tiers are covered with soft white snow because it is cold up there. Near the bottom, a thick ring of big fluffy white clouds wraps around the base of the crown, and a short piece of the orange-tan trunk continues below the clouds to the bottom edge. Flat solid magenta background (#FF00FF) everywhere else: no sky, no stars, no sun.
```

(+ estilo)

## Peça 5: nuvens

- **Arquivo:** `nuvens.png`, formato quadrado 1:1, sem guia.

```
A set of 6 separate fluffy cartoon clouds for a 2D mobile game, different sizes (2 large, 2 medium, 2 small), white with soft light-blue shading at the bottom and a thin soft blue outline, arranged in a loose grid with plenty of empty space between them, not touching each other, on a flat solid magenta background (#FF00FF).
```

(+ estilo)

## Peça 6: galhos

- **Arquivo:** `galhos.png`, formato 16:9, sem guia.

```
4 separate pine tree branches for a 2D mobile game, each one horizontal and growing from the left toward the right, brown bark with a dark-brown outline and lush dark-green needle clusters with light-green highlights, well separated from each other on a flat solid magenta background (#FF00FF).
```

(+ estilo)

## Como me mandar

Pode ser de um destes jeitos:

- **GitHub:** abra o repositório, troque o branch para `claude/bold-darwin-dgilyt` e entre na pasta `arte-cenario-ia/recebidas`. Depois clique em **Add file → Upload files** e envie os arquivos com os nomes acima. Não precisa mexer na `main`.
- **Links do Magnific:** libere o domínio `pikaso.cdnpk.net` na configuração de rede do ambiente e me mande os links das criações escolhidas. Aí eu baixo direto.
