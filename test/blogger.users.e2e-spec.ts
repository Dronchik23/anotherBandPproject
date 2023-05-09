import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp } from '../src/helpers/createApp';
import { UserInputModel } from '../src/types and models/models';
import { AppModule } from '../src/app.module';
import { EmailAdapter } from '../src/email/email.adapter';
import { UsersQueryRepository } from '../src/query-repositorys/users-query.repository';

describe('blogger tests (e2e)', () => {
  jest.setTimeout(1000 * 60 * 3);
  let app: INestApplication;
  let server: any;
  let accessToken;
  let blog;
  let user;
  let user2;
  let usersQueryRepository: UsersQueryRepository;
  const mokEmailAdapter = {
    async sendEmail(
      email: string,
      subject: string,
      message: string,
    ): Promise<void> {
      return;
    },
  };
  const url = '/blogger/users';
  const wipeAllDataUrl = '/testing/all-data';
  const userAgent = {
    'User-Agent': 'jest user-agent',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailAdapter)
      .useValue(mokEmailAdapter)
      .compile();

    app = moduleFixture.createNestApplication();
    app = createApp(app);
    usersQueryRepository = app.get(UsersQueryRepository);
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('blogger/users', () => {
    describe('ban user tests', () => {
      beforeAll(async () => {
        await request(server).delete(wipeAllDataUrl);

        const createUserDto: UserInputModel = {
          login: `user`,
          password: 'password',
          email: `user@gmail.com`,
        };

        const responseForUser = await request(server)
          .post('/sa/users')
          .auth('admin', 'qwerty')
          .send(createUserDto);

        user = responseForUser.body;
        expect(user).toBeDefined();

        const loginUser = await request(server)
          .post('/auth/login')
          .set(userAgent)
          .send({
            loginOrEmail: createUserDto.login,
            password: createUserDto.password,
          });

        accessToken = loginUser.body.accessToken;

        const responseForBlog = await request(server)
          .post('/blogger/blogs')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'name',
            websiteUrl: 'https://youtube.com',
            description: 'valid description',
          });

        blog = responseForBlog.body;
        expect(blog).toBeDefined();
      });
      it('should not ban user that not exist', async () => {
        const fakeUserId = 500;
        await request(server)
          .put(url + `${fakeUserId}/ban`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            isBanned: true,
            banReason: 'valid string more than 20 letters',
            blogid: blog.id,
          })
          .expect(404);
      });
      it('should not ban user with incorrect input data', async () => {
        await request(server)
          .put(url + `/${user.id}/ban`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            isBanned: true,
            banReason: 'not20string',
            blogId: blog.id,
          })
          .expect(400);

        await request(server)
          .put(url + `/${user.id}/ban`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            isBanned: '',
            banReason: 'valid string more than 20 letters',
            blogId: blog.id,
          })
          .expect(400);

        await request(server)
          .put(url + `/${user.id}/ban`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            isBanned: 'true',
            banReason: 'valid string more than 20 letters',
            blogId: '',
          })
          .expect(400);
      });
      it('should not ban user with incorrect authorization data', async () => {
        await request(server)
          .put(url + `/${user.id}/ban`)
          .set('Auth', `Bearer ${accessToken}`)
          .send({
            isBanned: 'true',
            banReason: 'valid string more than 20 letters',
            blogId: blog.id,
          })
          .expect(401);

        await request(server)
          .put(url + `/${user.id}/ban`)
          .set('Authorization', `Basic ${accessToken}`)
          .send({
            isBanned: 'true',
            banReason: 'valid string more than 20 letters',
            blogId: blog.id,
          })
          .expect(401);
      });
      it('should ban and unban user with correct data', async () => {
        const createUserDto2: UserInputModel = {
          login: `user2`,
          password: 'password',
          email: `user2@gmail.com`,
        };

        const responseForUser2 = await request(server)
          .post('/sa/users')
          .auth('admin', 'qwerty')
          .send(createUserDto2);

        const user2 = responseForUser2.body;
        expect(user2).toBeDefined();

        await request(server)
          .put(url + `/${user2.id}/ban`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            isBanned: true,
            banReason: 'valid string more than 20 letters ',
            blogId: blog.id,
          })
          .expect(204); // ban user2

        const response = await request(server)
          .get(`/sa/users/${user2.id}`)
          .auth('admin', 'qwerty');
        console.log('response.body', response.body);
        expect(response.body.banInfo.isBanned).toBeTruthy();

        await request(server)
          .put(url + `/${user2.id}/ban`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            isBanned: false,
            banReason: 'valid string more than 20 letters ',
            blogId: blog.id,
          })
          .expect(204); // ban user2

        // const unBannedUser: UserDBType =
        //   await usersQueryRepository.usersModel.findOne({
        //     _id: new ObjectId(user2.id),
        //   });
        // expect(unBannedUser.banInfo.isBanned).toBeFalsy();
      });
    });
    describe('get banned users by blogId tests', () => {
      beforeAll(async () => {
        await request(server).delete(wipeAllDataUrl);

        const createUserDto: UserInputModel = {
          login: `user`,
          password: 'password',
          email: `user@gmail.com`,
        };

        const responseForUser = await request(server)
          .post('/sa/users')
          .auth('admin', 'qwerty')
          .send(createUserDto);

        user = responseForUser.body;
        expect(user).toBeDefined();

        const loginUser = await request(server)
          .post('/auth/login')
          .set(userAgent)
          .send({
            loginOrEmail: createUserDto.login,
            password: createUserDto.password,
          });

        accessToken = loginUser.body.accessToken;

        const responseForBlog = await request(server)
          .post('/blogger/blogs')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'name',
            websiteUrl: 'https://youtube.com',
            description: 'valid description',
          });

        blog = responseForBlog.body;
        expect(blog).toBeDefined();
      });
      it('should get all banned users by blogId', async () => {
        const createUserDto2: UserInputModel = {
          login: `user2`,
          password: 'password',
          email: `user2@gmail.com`,
        };

        const responseForUser2 = await request(server)
          .post('/sa/users')
          .auth('admin', 'qwerty')
          .send(createUserDto2);

        const user2 = responseForUser2.body;
        expect(user2).toBeDefined();

        await request(server)
          .put(url + `/${user2.id}/ban`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            isBanned: true,
            banReason: 'valid string more than 20 letters ',
            blogId: blog.id,
          })
          .expect(204); // ban user2

        const response = await request(server)
          .get(`/sa/users/${user2.id}`)
          .auth('admin', 'qwerty');

        const bannedUser = response.body;

        expect(bannedUser.banInfo.isBanned).toBeTruthy();
        expect(bannedUser.id).toEqual(user2.id);

        await request(server)
          .get(url + `/blog/${blog.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200)
          .expect((res) => {
            const user = res.body.items[0];

            expect(res.body.pagesCount).toBe(1);
            expect(res.body.page).toBe(1);
            expect(res.body.pageSize).toBe(10);
            expect(res.body.totalCount).toBe(1);
            expect(user.id).toBeDefined();
            expect(user.login).toBe(user2.login);
            expect(user.banInfo).toBeDefined();
            expect(res.body.items.length).toBe(1);
          });

        await request(server)
          .put(url + `/${user2.id}/ban`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            isBanned: false,
            banReason: 'valid string more than 20 letters ',
            blogId: blog.id,
          })
          .expect(204); // unban user2

        // const unBannedUser: UserDBType =
        //   await usersQueryRepository.usersModel.findOne({
        //     _id: new ObjectId(user2.id),
        //   });
        // expect(unBannedUser.isBanned).toBeFalsy();
        // expect(unBannedUser.id).toEqual(user2.id);

        const a = await request(server)
          .get(url + `/blog/${blog.id}`)
          .set('Authorization', `Bearer ${accessToken}`);
        console.log(a.body.items);

        await request(server)
          .get(url + `/blog/${blog.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200)
          .expect((res) => {
            const user = res.body.items[0];
            expect(res.body.pagesCount).toBe(1);
            expect(res.body.page).toBe(1);
            expect(res.body.pageSize).toBe(10);
            expect(res.body.totalCount).toBe(0);
            expect(user).toBeUndefined();
            expect(user).toBeUndefined();
            expect(res.body.items.length).toBe(0);
          });
      });
      it('should not get all banned users by blogId with incorrect authorization data', async () => {
        await request(server)
          .get(url + `/blog/${blog.id}`)
          .set('Authorization', `Basic ${accessToken}`)
          .expect(401);
      });
    });
  });
});
