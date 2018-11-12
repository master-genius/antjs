#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>

/*
    守护进程创建，可以用于任何程序的守护化工作，
    最开始是针对node进行守护进程服务而设计。
    原因是node并没有提供好用的守护进程创建方式，
    并且创建子进程和系统底层的方式不一样，导致
    无法创建。这可能是我还没有了解到如何去做，
    不过还是要说一句：node垃圾。
*/

/*
    设计方案：
        -f          指定配置文件，默认是在$HOME/.config/dae.conf
        -r          要运行的程序带参数要用''包含
        --master    开启此选项表示运行的命令会作为dae的子进程，
                    默认情况dae会仅仅把要运行的命令作为守护进程。

        --stat-file 指定监控信息输出文件，这个选项要配合--master使用，
                    dae管理进程会把子进程的内存占有率、CPU占有率、打开文件
                    等信息放在此文件中。
        --auto-cmd  自动搜索命令所在路径

*/

//此功能暂时没有实现
#define CONFIG_FILE     ".config/dae.conf"

#define ARGS_CFG        0       //是否开启配置文件支持

#define ARGS_MASTER     1

//暂时没有实现
#define ARGS_AUTOFD     2       //自动搜索命令

#define ARGS_END        8

char _args[ARGS_END] = {0,};


//最大参数，使用此结构目的在于不用申请内存
#define MAX_CMDIND      64
struct cmdsplit {
    char *cmdind[MAX_CMDIND+1];
    int endi;
};

#define MAX_CMD_PATH    2048
char _cmd_buffer[MAX_CMD_PATH+1];

/* --------------------------------------------- */

int cmd_split(char *cmd, struct cmdsplit *split);

int cmd_run(struct cmdsplit * cmd);

char * find_cmd(char *name, char * cmd_buffer);

/* ---------------------------------------------- */

/*
    -1 : 超出最大限至
     0 : 没有命令
*/
int cmd_split(char *cmd, struct cmdsplit *split) {
    char *p;
    int count = 0;
    p = strtok(cmd, " ");
    while(p) {
        split->cmdind[count] = p;
        count ++;
        
        if (count > MAX_CMDIND) {
            return -1;
        }

        p = strtok(NULL, " ");
    }
    split->cmdind[count] = NULL;
    split->endi = count;

    return count;
}

int cmd_run(struct cmdsplit * cmd){
    if (cmd->endi <= 0) {
        return -1;
    }

    return execv(cmd->cmdind[0], cmd->cmdind);
}

void out_err(char *err) {
    dprintf(2, "\e[37;41m%s\n\e[0m", err);
}

int main(int argc, char *argv[], char *envp[]) {

    if (argc < 2) {
        return 0;
    }

    struct cmdsplit cmd;
    char *c = NULL;

    for(int i=1; i<argc; i++) {
        if (strcmp(argv[i], "-r") == 0) {
            i++;
            if (i >= argc ) {
                out_err("Error: less cmd");
                return -1;
            }

            if (c != NULL) {
                out_err("Error: too many cmd");
                return -1;
            }

            c = argv[i];
        } else if (strcmp(argv[i], "--master") == 0) {
            _args[ARGS_MASTER] = 1;
        } else {
            out_err("Error: unknow argument");
            return -1;
        }
    }
    int r = cmd_split(c, &cmd);

    if (r < 0) {
        out_err("Error: too many arguments in your cmd");
        return -1;
    } else if (r == 0) {
        out_err("Error: cmd is wrong");
        return -1;
    }

    pid_t pid = fork();

    if (pid < 0) {
        perror("fork");
        return -1;
    }

    if (pid > 0) {
        exit(0);
    }

    setsid();

    if (_args[ARGS_MASTER]) {
        pid = fork();
        if (pid < 0) {
            perror("fork");
            return -1;
        }
        if (pid == 0) {
            return cmd_run(&cmd);
        }
    } else {
        return cmd_run(&cmd);
    }

	return 0;
}

/*
    Linux上获取socket连接的解决方案：
    在/proc目录会存在进程ID的目录，其中的net目录有两个文件：
        socketstat, socketstat6
*/
