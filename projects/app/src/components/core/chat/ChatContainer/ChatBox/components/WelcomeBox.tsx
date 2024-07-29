import { Box, Card, CardBody, Heading, Stack, Text, Flex, forwardRef } from '@chakra-ui/react';
import React, { useEffect, useRef, useState } from 'react';
import { MessageCardStyle } from '../constants';
import Markdown from '@/components/Markdown';
import ChatAvatar from './ChatAvatar';
import { useContextSelector } from 'use-context-selector';
import { ChatBoxContext } from '../Provider';

import MyIcon from '@fastgpt/web/components/common/Icon';

import { EventNameEnum, eventBus } from '@/web/common/utils/eventbus';
import { useSystem } from '@fastgpt/web/hooks/useSystem';

const WelcomeBox = forwardRef(({ welcomeText }, ref) => {
  const appAvatar = useContextSelector(ChatBoxContext, (v) => v.appAvatar);
  const { isPc } = useSystem();
  const containerRef = useRef(null);
  const [showHelper, setShowHelper] = useState(false);
  const [cardWidth, setCardWidth] = useState('100%');

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = (containerRef.current as HTMLElement).offsetWidth;
        setCardWidth(`${containerWidth}px`);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Call the function initially to set the correct width

    setTimeout(() => {
      handleResize();
      setShowHelper(true);
    }, 100);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleClick = (text: string) => {
    eventBus.emit(EventNameEnum.sendQuestion, { text });
  };

  return (
    <Box py={3}>
      {/* Avatar */}
      <ChatAvatar src={appAvatar} type={'AI'} />
      {/* Message */}
      <Box textAlign={'left'}>
        <Card
          order={2}
          mt={2}
          {...MessageCardStyle}
          bg={'white'}
          boxShadow={'0 0 8px rgba(0,0,0,0.15)'}
          ref={containerRef}
        >
          <Markdown source={`~~~guide \n${welcomeText}`} />
        </Card>
      </Box>

      {showHelper && (
        <Box textAlign={'left'}>
          <Card
            order={2}
            mt={2}
            {...MessageCardStyle}
            borderRadius={isPc ? '8px' : '0 8px 8px 8px'}
            bg={'white'}
            boxShadow={'0 0 8px rgba(0,0,0,0.15)'}
            w={cardWidth}
            p={0}
            cursor={'pointer'}
            onClick={() => handleClick('创建一个关于2024年国庆节放假的通知')}
          >
            <CardBody p={0}>
              <Flex>
                <Stack pt="3" pr="4" pb="3" pl="4" spacing="1" w={'calc(100% - 30px)'}>
                  <Flex>
                    <MyIcon mr={1} name={'notice/helper'} w={'20px'} />
                    <Heading fontSize="sm">公告通知助手</Heading>
                  </Flex>
                  <Text fontSize="xs" color={'#949494'}>
                    创建一个关于2024年国庆节放假的通知
                  </Text>
                </Stack>
                <MyIcon mr={1} name={'common/rightArrowLight'} w={'10px'} />
              </Flex>
            </CardBody>
          </Card>
        </Box>
      )}

      {showHelper && (
        <Box>
          <Card
            order={2}
            mt={2}
            {...MessageCardStyle}
            borderRadius={isPc ? '8px' : '0 8px 8px 8px'}
            bg={'white'}
            boxShadow={'0 0 8px rgba(0,0,0,0.15)'}
            w={cardWidth}
            p={0}
            ml={isPc ? '15px' : '0px'}
            cursor={'pointer'}
            onClick={() => handleClick('创建一个关于员工信息登记的表单')}
          >
            <CardBody p={0}>
              <Flex>
                <Stack pt="3" pr="4" pb="3" pl="4" spacing="1" w={'calc(100% - 30px)'}>
                  <Flex>
                    <MyIcon mr={1} name={'appcenter/form/helper'} w={'20px'} />
                    <Heading fontSize="sm">应用中心表单助手</Heading>
                  </Flex>
                  <Text fontSize="xs" color={'#949494'}>
                    创建一个关于员工信息登记的表单
                  </Text>
                </Stack>
                <MyIcon mr={1} name={'common/rightArrowLight'} w={'10px'} />
              </Flex>
            </CardBody>
          </Card>
        </Box>
      )}
    </Box>
  );
});

export default WelcomeBox;
