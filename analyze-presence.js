const { DynamoDBClient, ScanCommand } = require("@aws-sdk/client-dynamodb");

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bg_green: '\x1b[42m',
    bg_red: '\x1b[41m'
};

const icons = {
    online: '🟢',
    offline: '🔴',
    break: '☕',
    work: '💼',
    calendar: '📅',
    clock: '🕐',
    stats: '📊'
};

const dynamoDbClient = new DynamoDBClient();

const getAllPresenceData = async (tableName) => {
    const params = {
        TableName: tableName,
    };

    try {
        const command = new ScanCommand(params);
        const response = await dynamoDbClient.send(command);

        return response.Items.map(item => ({
            userid: item.userid.S,
            presence: item.presence.S,
            datetime: new Date(item.datetime.S)
        }));
    } catch (error) {
        throw new Error(`Failed to scan DynamoDB: ${error.message}`);
    }
};

const isWeekday = (date) => {
    const day = date.getDay();
    return day >= 1 && day <= 5;
};

const formatDate = (date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const month = months[date.getMonth()];
    const day = String(date.getDate()).padStart(2, '0');
    const dayName = days[date.getDay()];

    return `${month} ${day}, ${dayName}`;
};

const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

const getDurationInMinutes = (start, end) => {
    return Math.round((end - start) / (1000 * 60));
};

const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) {
        return `${mins}m`;
    } else if (mins === 0) {
        return `${hours}h`;
    } else {
        return `${hours}h ${mins}m`;
    }
};

const groupByDate = (data) => {
    const grouped = {};

    data.forEach(entry => {
        const dateKey = entry.datetime.toDateString();
        if (!grouped[dateKey]) {
            grouped[dateKey] = [];
        }
        grouped[dateKey].push(entry);
    });

    Object.keys(grouped).forEach(date => {
        grouped[date].sort((a, b) => a.datetime - b.datetime);
    });

    return grouped;
};

const detectBreaks = (dayData, workStart, workEnd) => {
    const breaks = [];
    let currentBreakStart = null;

    for (let i = 0; i < dayData.length; i++) {
        const entry = dayData[i];
        const entryTime = entry.datetime;

        if (entryTime < workStart || entryTime > workEnd) {
            continue;
        }

        if (entry.presence === 'away' && !currentBreakStart) {
            currentBreakStart = entryTime;
        } else if (entry.presence === 'active' && currentBreakStart) {
            const breakDuration = getDurationInMinutes(currentBreakStart, entryTime);
            if (breakDuration >= 5) {
                breaks.push({
                    start: currentBreakStart,
                    end: entryTime,
                    duration: breakDuration
                });
            }
            currentBreakStart = null;
        }
    }

    if (currentBreakStart && currentBreakStart < workEnd) {
        const breakDuration = getDurationInMinutes(currentBreakStart, workEnd);
        if (breakDuration >= 5) {
            breaks.push({
                start: currentBreakStart,
                end: workEnd,
                duration: breakDuration
            });
        }
    }

    return breaks;
};

const analyzeDayData = (dayData, date) => {
    if (dayData.length === 0) {
        return null;
    }

    const onlineEntries = dayData.filter(entry => entry.presence === 'active');

    if (onlineEntries.length === 0) {
        return {
            date: date,
            firstOnline: null,
            lastOnline: null,
            totalOnline: 0,
            totalOffline: 0,
            breaks: []
        };
    }

    const firstOnline = onlineEntries[0].datetime;
    const lastOnline = onlineEntries[onlineEntries.length - 1].datetime;

    let totalOnlineMinutes = 0;
    let totalOfflineMinutes = 0;

    for (let i = 0; i < dayData.length - 1; i++) {
        const current = dayData[i];
        const next = dayData[i + 1];

        if (current.datetime >= firstOnline && current.datetime <= lastOnline) {
            const duration = getDurationInMinutes(current.datetime, next.datetime);

            if (current.presence === 'active') {
                totalOnlineMinutes += duration;
            } else {
                totalOfflineMinutes += duration;
            }
        }
    }

    const breaks = detectBreaks(dayData, firstOnline, lastOnline);

    return {
        date: date,
        firstOnline: firstOnline,
        lastOnline: lastOnline,
        totalOnline: totalOnlineMinutes,
        totalOffline: totalOfflineMinutes,
        breaks: breaks
    };
};

const printAnalysis = (analysis) => {
    console.log(`\n${colors.bright}${colors.cyan}${icons.stats} SLACK PRESENCE ANALYSIS${colors.reset}\n`);

    const sortedDays = Object.keys(analysis)
        .map(dateStr => new Date(dateStr))
        .sort((a, b) => a - b);

    sortedDays.forEach(date => {
        const dayAnalysis = analysis[date.toDateString()];

        if (!dayAnalysis || !dayAnalysis.firstOnline) {
            console.log(`${colors.dim}${icons.calendar} ${formatDate(date)} - No activity${colors.reset}\n`);
            return;
        }

        console.log(`${colors.bright}${colors.blue}${icons.calendar} ${formatDate(date)}${colors.reset}`);

        console.log(`  ${colors.green}${icons.work} Work Hours: ${formatTime(dayAnalysis.firstOnline)} - ${formatTime(dayAnalysis.lastOnline)}${colors.reset}`);

        const totalWorkMinutes = dayAnalysis.totalOnline + dayAnalysis.totalOffline;
        const onlinePercentage = totalWorkMinutes > 0 ? Math.round((dayAnalysis.totalOnline / totalWorkMinutes) * 100) : 0;

        console.log(`  ${colors.green}${icons.online} Online:  ${formatDuration(dayAnalysis.totalOnline)} (${onlinePercentage}%)${colors.reset}`);
        console.log(`  ${colors.red}${icons.offline} Offline: ${formatDuration(dayAnalysis.totalOffline)} (${100 - onlinePercentage}%)${colors.reset}`);

        if (dayAnalysis.breaks.length > 0) {
            console.log(`  ${colors.yellow}${icons.break} Breaks: ${dayAnalysis.breaks.length} (${formatDuration(dayAnalysis.breaks.reduce((sum, b) => sum + b.duration, 0))})${colors.reset}`);

            dayAnalysis.breaks.forEach((breakItem, index) => {
                const breakStart = formatTime(breakItem.start);
                const breakEnd = formatTime(breakItem.end);
                const duration = formatDuration(breakItem.duration);
                console.log(`     ${colors.dim}${index + 1}. ${breakStart} - ${breakEnd} (${duration})${colors.reset}`);
            });
        } else {
            console.log(`${colors.dim}${icons.break} Breaks: None${colors.reset}`);
        }

        console.log();
    });
};

const analyzePresenceData = async () => {
    try {
        const tableName = process.env.DYNAMODB_TABLE_NAME;

        if (!tableName) {
            throw new Error('DYNAMODB_TABLE_NAME environment variable is required');
        }

        console.log(`${colors.bright}${colors.cyan}Fetching presence data from DynamoDB...${colors.reset}`);

        const allData = await getAllPresenceData(tableName);
        console.log(`${colors.green}Found ${allData.length} records${colors.reset}`);

        const weekdayData = allData.filter(entry => isWeekday(entry.datetime));
        console.log(`${colors.green}Filtered to ${weekdayData.length} weekday records${colors.reset}`);

        const groupedData = groupByDate(weekdayData);

        const analysis = {};
        Object.keys(groupedData).forEach(dateStr => {
            const date = new Date(dateStr);
            if (isWeekday(date)) {
                analysis[dateStr] = analyzeDayData(groupedData[dateStr], date);
            }
        });

        printAnalysis(analysis);

    } catch (error) {
        console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
        process.exit(1);
    }
};

analyzePresenceData();
