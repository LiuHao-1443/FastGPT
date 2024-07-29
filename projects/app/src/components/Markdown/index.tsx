import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import 'katex/dist/katex.min.css';
import RemarkMath from 'remark-math';
import RemarkBreaks from 'remark-breaks';
import RehypeKatex from 'rehype-katex';
import RemarkGfm from 'remark-gfm';

import styles from './index.module.scss';
import dynamic from 'next/dynamic';

import { Link, Button, Text, Box, Flex, useTheme } from '@chakra-ui/react';
import MyTooltip from '@fastgpt/web/components/common/MyTooltip';
import { useTranslation } from 'next-i18next';
import { EventNameEnum, eventBus } from '@/web/common/utils/eventbus';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { MARKDOWN_QUOTE_SIGN } from '@fastgpt/global/core/chat/constants';
import ChatBoxDivider from '../core/chat/Divider';
import { useToast } from '@fastgpt/web/hooks/useToast';

const CodeLight = dynamic(() => import('./CodeLight'), { ssr: false });
const MermaidCodeBlock = dynamic(() => import('./img/MermaidCodeBlock'), { ssr: false });
const MdImage = dynamic(() => import('./img/Image'), { ssr: false });
const EChartsCodeBlock = dynamic(() => import('./img/EChartsCodeBlock'), { ssr: false });

const ChatGuide = dynamic(() => import('./chat/Guide'), { ssr: false });
const QuestionGuide = dynamic(() => import('./chat/QuestionGuide'), { ssr: false });

export enum CodeClassName {
  guide = 'guide',
  questionGuide = 'questionGuide',
  mermaid = 'mermaid',
  echarts = 'echarts',
  quote = 'quote',
  files = 'files'
}

const Markdown = ({
  source = '',
  showAnimation = false
}: {
  source?: string;
  showAnimation?: boolean;
}) => {
  const components = useMemo<any>(
    () => ({
      img: Image,
      pre: 'div',
      p: (pProps: any) => <p {...pProps} dir="auto" />,
      code: Code,
      a: A
    }),
    []
  );

  const { toast } = useToast();
  const { t } = useTranslation();
  const theme = useTheme();

  const parseJsonSafe = (jsonString: string) => {
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      return null;
    }
  };

  const extractAndParseActions = (source: string) => {
    const actionRegex = /SYSTEM_ACTION_BEGIN\|(.*?)\|SYSTEM_ACTION_END\n?/g;
    let match;
    const actions = [];
    let newSource = source;

    while ((match = actionRegex.exec(source)) !== null) {
      const jsonString = match[1];
      const parsedJson = parseJsonSafe(jsonString);
      if (parsedJson) {
        actions.push(parsedJson);
      }
      // Remove the matched part from the source including the trailing newline
      newSource = newSource.replace(match[0], '');
    }

    return { actions, newSource };
  };

  // Example usage:
  const { actions, newSource } = extractAndParseActions(source);
  // You can now use `actions` as needed

  const handleClick = (action: any, index: number) => {
    // 在这里处理点击事件，可以根据 action 对象和 index 参数进行操作
    let noAction = true;

    if (action['ACTION']) {
      if (action['ACTION'] === 'OPEN_NEW_WINDOW' && action['URL']) {
        noAction = false;
        window.open(action['URL'], '_blank'); // 打开新窗口
        return;
      }
    }

    if (!noAction) {
      toast({
        status: 'warning',
        title: t('common:core.chat.Quick Command No Action')
      });
    }
  };

  const formatSource = newSource
    // .replace(/\\n/g, '\n')
    .replace(/(http[s]?:\/\/[^\s，。]+)([。，])/g, '$1 $2')
    .replace(/\n*(\[QUOTE SIGN\]\(.*\))/g, '$1');

  return (
    <>
      <ReactMarkdown
        className={`markdown ${styles.markdown}
      ${showAnimation ? `${formatSource ? styles.waitingAnimation : styles.animation}` : ''}
    `}
        remarkPlugins={[RemarkMath, [RemarkGfm, { singleTilde: false }], RemarkBreaks]}
        rehypePlugins={[RehypeKatex]}
        components={components}
        linkTarget={'_blank'}
      >
        {formatSource}
      </ReactMarkdown>
      {actions.length > 0 && (
        <Box mt={2}>
          <ChatBoxDivider
            icon="core/chat/quickCommand"
            text={t('common:core.chat.Quick Command')}
          />
          <Flex alignItems={'center'} flexWrap={'wrap'} gap={2}>
            {actions.map((action, index) => (
              <Flex
                key={action.text}
                alignItems={'center'}
                flexWrap={'wrap'}
                fontSize={'xs'}
                border={theme.borders.sm}
                py={'1px'}
                px={3}
                borderRadius={'md'}
                _hover={{
                  backgroundColor: 'gray.100' // 你可以根据需要调整颜色
                }}
                overflow={'hidden'}
                position={'relative'}
                cursor="pointer"
                onClick={() => handleClick(action, index)}
              >
                <Box className="textEllipsis" flex={'1 0 0'}>
                  {action['TEXT']}
                </Box>
              </Flex>
            ))}
          </Flex>
        </Box>
      )}
    </>
  );
};

export default React.memo(Markdown);

const Code = React.memo(function Code(e: any) {
  const { inline, className, children } = e;

  const match = /language-(\w+)/.exec(className || '');
  const codeType = match?.[1];

  const strChildren = String(children);

  const Component = useMemo(() => {
    if (codeType === CodeClassName.mermaid) {
      return <MermaidCodeBlock code={strChildren} />;
    }

    if (codeType === CodeClassName.guide) {
      return <ChatGuide text={strChildren} />;
    }
    if (codeType === CodeClassName.questionGuide) {
      return <QuestionGuide text={strChildren} />;
    }
    if (codeType === CodeClassName.echarts) {
      return <EChartsCodeBlock code={strChildren} />;
    }

    return (
      <CodeLight className={className} inline={inline} match={match}>
        {children}
      </CodeLight>
    );
  }, [codeType, className, inline, match, children, strChildren]);

  return Component;
});

const Image = React.memo(function Image({ src }: { src?: string }) {
  return <MdImage src={src} />;
});
const A = React.memo(function A({ children, ...props }: any) {
  const { t } = useTranslation();

  // empty href link
  if (!props.href && typeof children?.[0] === 'string') {
    const text = useMemo(() => String(children), [children]);

    return (
      <MyTooltip label={t('common:core.chat.markdown.Quick Question')}>
        <Button
          variant={'whitePrimary'}
          size={'xs'}
          borderRadius={'md'}
          my={1}
          onClick={() => eventBus.emit(EventNameEnum.sendQuestion, { text })}
        >
          {text}
        </Button>
      </MyTooltip>
    );
  }

  // quote link(未使用)
  if (children?.length === 1 && typeof children?.[0] === 'string') {
    const text = String(children);
    if (text === MARKDOWN_QUOTE_SIGN && props.href) {
      return (
        <MyTooltip label={props.href}>
          <MyIcon
            name={'core/chat/quoteSign'}
            transform={'translateY(-2px)'}
            w={'18px'}
            color={'primary.500'}
            cursor={'pointer'}
            _hover={{
              color: 'primary.700'
            }}
            // onClick={() => getCollectionSourceAndOpen(props.href)}
          />
        </MyTooltip>
      );
    }
  }

  return <Link {...props}>{children}</Link>;
});
